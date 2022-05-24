/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { get, each, last, find } from 'lodash';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/server';
import { ML_JOB_FIELD_TYPES } from '../../../common/constants/field_types';
import { getSafeAggregationName } from '../../../common/util/job_utils';
import { stringHash } from '../../../common/util/string_utils';
import {
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSamplerAggregationsResponsePath,
} from '../../lib/query_utils';
import { AggCardinality, RuntimeMappings } from '../../../common/types/fields';
import { getDatafeedAggregations } from '../../../common/util/datafeed_utils';
import { Datafeed } from '../../../common/types/anomaly_detection_jobs';
import { isPopulatedObject } from '../../../common/util/object_utils';

const SAMPLER_TOP_TERMS_THRESHOLD = 100000;
const SAMPLER_TOP_TERMS_SHARD_SIZE = 5000;
const AGGREGATABLE_EXISTS_REQUEST_BATCH_SIZE = 200;
const FIELDS_REQUEST_BATCH_SIZE = 10;

const MAX_CHART_COLUMNS = 20;

interface FieldData {
  fieldName: string;
  existsInDocs: boolean;
  stats?: {
    sampleCount?: number;
    count?: number;
    cardinality?: number;
  };
}

export interface Field {
  fieldName: string;
  type: string;
  cardinality: number;
}

export interface HistogramField {
  fieldName: string;
  type: string;
}

interface Distribution {
  percentiles: any[];
  minPercentile: number;
  maxPercentile: number;
}

interface Aggs {
  [key: string]: any;
}

interface Bucket {
  doc_count: number;
}

interface NumericFieldStats {
  fieldName: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  topValuesSampleSize: number;
  topValuesSamplerShardSize: number;
  median?: number;
  distribution?: Distribution;
}

interface StringFieldStats {
  fieldName: string;
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  topValuesSampleSize: number;
  topValuesSamplerShardSize: number;
}

interface DateFieldStats {
  fieldName: string;
  count: number;
  earliest: number;
  latest: number;
}

interface BooleanFieldStats {
  fieldName: string;
  count: number;
  trueCount: number;
  falseCount: number;
  [key: string]: number | string;
}

interface DocumentCountStats {
  documentCounts: {
    interval: number;
    buckets: { [key: string]: number };
  };
}

interface FieldExamples {
  fieldName: string;
  examples: any[];
}

interface NumericColumnStats {
  interval: number;
  min: number;
  max: number;
}
type NumericColumnStatsMap = Record<string, NumericColumnStats>;

interface AggHistogram {
  histogram: {
    field: string;
    interval: number;
  };
}

interface AggTerms {
  terms: {
    field: string;
    size: number;
  };
}

interface NumericDataItem {
  key: number;
  key_as_string?: string;
  doc_count: number;
}

interface NumericChartData {
  data: NumericDataItem[];
  id: string;
  interval: number;
  stats: [number, number];
  type: 'numeric';
}

interface OrdinalDataItem {
  key: string;
  key_as_string?: string;
  doc_count: number;
}

interface OrdinalChartData {
  type: 'ordinal' | 'boolean';
  cardinality: number;
  data: OrdinalDataItem[];
  id: string;
}

interface UnsupportedChartData {
  id: string;
  type: 'unsupported';
}

type ChartRequestAgg = AggHistogram | AggCardinality | AggTerms;

// type ChartDataItem = NumericDataItem | OrdinalDataItem;
type ChartData = NumericChartData | OrdinalChartData | UnsupportedChartData;

type BatchStats =
  | NumericFieldStats
  | StringFieldStats
  | BooleanFieldStats
  | DateFieldStats
  | DocumentCountStats
  | FieldExamples;

const getAggIntervals = async (
  { asCurrentUser }: IScopedClusterClient,
  indexPattern: string,
  query: any,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: RuntimeMappings
): Promise<NumericColumnStatsMap> => {
  const numericColumns = fields.filter((field) => {
    return field.type === KBN_FIELD_TYPES.NUMBER || field.type === KBN_FIELD_TYPES.DATE;
  });

  if (numericColumns.length === 0) {
    return {};
  }

  const minMaxAggs = numericColumns.reduce((aggs, c) => {
    const id = stringHash(c.fieldName);
    aggs[id] = {
      stats: {
        field: c.fieldName,
      },
    };
    return aggs;
  }, {} as Record<string, object>);

  const body = await asCurrentUser.search({
    index: indexPattern,
    size: 0,
    body: {
      query,
      aggs: buildSamplerAggregation(minMaxAggs, samplerShardSize),
      size: 0,
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    },
  });

  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const aggregations = aggsPath.length > 0 ? get(body.aggregations, aggsPath) : body.aggregations;

  return Object.keys(aggregations).reduce((p, aggName) => {
    const stats = [aggregations[aggName].min, aggregations[aggName].max];
    if (!stats.includes(null)) {
      const delta = aggregations[aggName].max - aggregations[aggName].min;

      let aggInterval = 1;

      if (delta > MAX_CHART_COLUMNS || delta <= 1) {
        aggInterval = delta / (MAX_CHART_COLUMNS - 1);
      }

      p[aggName] = { interval: aggInterval, min: stats[0], max: stats[1] };
    }

    return p;
  }, {} as NumericColumnStatsMap);
};

// export for re-use by transforms plugin
export const getHistogramsForFields = async (
  client: IScopedClusterClient,
  indexPattern: string,
  query: any,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings?: RuntimeMappings
) => {
  const { asCurrentUser } = client;
  const aggIntervals = await getAggIntervals(
    client,
    indexPattern,
    query,
    fields,
    samplerShardSize,
    runtimeMappings
  );

  const chartDataAggs = fields.reduce((aggs, field) => {
    const fieldName = field.fieldName;
    const fieldType = field.type;
    const id = stringHash(fieldName);
    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      if (aggIntervals[id] !== undefined) {
        aggs[`${id}_histogram`] = {
          histogram: {
            field: fieldName,
            interval: aggIntervals[id].interval !== 0 ? aggIntervals[id].interval : 1,
          },
        };
      }
    } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
      if (fieldType === KBN_FIELD_TYPES.STRING) {
        aggs[`${id}_cardinality`] = {
          cardinality: {
            field: fieldName,
          },
        };
      }
      aggs[`${id}_terms`] = {
        terms: {
          field: fieldName,
          size: MAX_CHART_COLUMNS,
        },
      };
    }
    return aggs;
  }, {} as Record<string, ChartRequestAgg>);

  if (Object.keys(chartDataAggs).length === 0) {
    return [];
  }

  const body = await asCurrentUser.search({
    index: indexPattern,
    size: 0,
    body: {
      query,
      aggs: buildSamplerAggregation(chartDataAggs, samplerShardSize),
      size: 0,
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    },
  });

  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const aggregations = aggsPath.length > 0 ? get(body.aggregations, aggsPath) : body.aggregations;

  const chartsData: ChartData[] = fields.map((field): ChartData => {
    const fieldName = field.fieldName;
    const fieldType = field.type;
    const id = stringHash(field.fieldName);

    if (fieldType === KBN_FIELD_TYPES.NUMBER || fieldType === KBN_FIELD_TYPES.DATE) {
      if (aggIntervals[id] === undefined) {
        return {
          type: 'numeric',
          data: [],
          interval: 0,
          stats: [0, 0],
          id: fieldName,
        };
      }

      return {
        data: aggregations[`${id}_histogram`].buckets,
        interval: aggIntervals[id].interval,
        stats: [aggIntervals[id].min, aggIntervals[id].max],
        type: 'numeric',
        id: fieldName,
      };
    } else if (fieldType === KBN_FIELD_TYPES.STRING || fieldType === KBN_FIELD_TYPES.BOOLEAN) {
      return {
        type: fieldType === KBN_FIELD_TYPES.STRING ? 'ordinal' : 'boolean',
        cardinality:
          fieldType === KBN_FIELD_TYPES.STRING ? aggregations[`${id}_cardinality`].value : 2,
        data: aggregations[`${id}_terms`].buckets,
        id: fieldName,
      };
    }

    return {
      type: 'unsupported',
      id: fieldName,
    };
  });

  return chartsData;
};

export class DataVisualizer {
  private _client: IScopedClusterClient;
  private _asCurrentUser: IScopedClusterClient['asCurrentUser'];

  constructor(client: IScopedClusterClient) {
    this._asCurrentUser = client.asCurrentUser;
    this._client = client;
  }

  // Obtains overall stats on the fields in the supplied index pattern, returning an object
  // containing the total document count, and four arrays showing which of the supplied
  // aggregatable and non-aggregatable fields do or do not exist in documents.
  // Sampling will be used if supplied samplerShardSize > 0.
  async getOverallStats(
    indexPatternTitle: string,
    query: object,
    aggregatableFields: string[],
    nonAggregatableFields: string[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: RuntimeMappings
  ) {
    const stats = {
      totalCount: 0,
      aggregatableExistsFields: [] as FieldData[],
      aggregatableNotExistsFields: [] as FieldData[],
      nonAggregatableExistsFields: [] as FieldData[],
      nonAggregatableNotExistsFields: [] as FieldData[],
    };

    // To avoid checking for the existence of too many aggregatable fields in one request,
    // split the check into multiple batches (max 200 fields per request).
    const batches: string[][] = [[]];
    each(aggregatableFields, (field) => {
      let lastArray: string[] = last(batches) as string[];
      if (lastArray.length === AGGREGATABLE_EXISTS_REQUEST_BATCH_SIZE) {
        lastArray = [];
        batches.push(lastArray);
      }
      lastArray.push(field);
    });

    await Promise.all(
      batches.map(async (fields) => {
        const batchStats = await this.checkAggregatableFieldsExist(
          indexPatternTitle,
          query,
          fields,
          samplerShardSize,
          timeFieldName,
          earliestMs,
          latestMs,
          undefined,
          runtimeMappings
        );

        // Total count will be returned with each batch of fields. Just overwrite.
        stats.totalCount = batchStats.totalCount;

        // Add to the lists of fields which do and do not exist.
        stats.aggregatableExistsFields.push(...batchStats.aggregatableExistsFields);
        stats.aggregatableNotExistsFields.push(...batchStats.aggregatableNotExistsFields);
      })
    );

    await Promise.all(
      nonAggregatableFields.map(async (field) => {
        const existsInDocs = await this.checkNonAggregatableFieldExists(
          indexPatternTitle,
          query,
          field,
          timeFieldName,
          earliestMs,
          latestMs,
          runtimeMappings
        );

        const fieldData: FieldData = {
          fieldName: field,
          existsInDocs,
          stats: {},
        };

        if (existsInDocs === true) {
          stats.nonAggregatableExistsFields.push(fieldData);
        } else {
          stats.nonAggregatableNotExistsFields.push(fieldData);
        }
      })
    );

    return stats;
  }

  // Obtains binned histograms for supplied list of fields. The statistics for each field in the
  // returned array depend on the type of the field (keyword, number, date etc).
  // Sampling will be used if supplied samplerShardSize > 0.
  async getHistogramsForFields(
    indexPattern: string,
    query: any,
    fields: HistogramField[],
    samplerShardSize: number,
    runtimeMappings?: RuntimeMappings
  ): Promise<any> {
    return await getHistogramsForFields(
      this._client,
      indexPattern,
      query,
      fields,
      samplerShardSize,
      runtimeMappings
    );
  }

  // Obtains statistics for supplied list of fields. The statistics for each field in the
  // returned array depend on the type of the field (keyword, number, date etc).
  // Sampling will be used if supplied samplerShardSize > 0.
  async getStatsForFields(
    indexPatternTitle: string,
    query: any,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    intervalMs: number | undefined,
    maxExamples: number,
    runtimeMappings: RuntimeMappings
  ): Promise<BatchStats[]> {
    // Batch up fields by type, getting stats for multiple fields at a time.
    const batches: Field[][] = [];
    const batchedFields: { [key: string]: Field[][] } = {};
    each(fields, (field) => {
      if (field.fieldName === undefined) {
        // undefined fieldName is used for a document count request.
        // getDocumentCountStats requires timeField - don't add to batched requests if not defined
        if (timeFieldName !== undefined) {
          batches.push([field]);
        }
      } else {
        const fieldType = field.type;
        if (batchedFields[fieldType] === undefined) {
          batchedFields[fieldType] = [[]];
        }
        let lastArray: Field[] = last(batchedFields[fieldType]) as Field[];
        if (lastArray.length === FIELDS_REQUEST_BATCH_SIZE) {
          lastArray = [];
          batchedFields[fieldType].push(lastArray);
        }
        lastArray.push(field);
      }
    });

    each(batchedFields, (lists) => {
      batches.push(...lists);
    });

    let results: BatchStats[] = [];
    await Promise.all(
      batches.map(async (batch) => {
        let batchStats: BatchStats[] = [];
        const first = batch[0];
        switch (first.type) {
          case ML_JOB_FIELD_TYPES.NUMBER:
            // undefined fieldName is used for a document count request.
            if (first.fieldName !== undefined) {
              batchStats = await this.getNumericFieldsStats(
                indexPatternTitle,
                query,
                batch,
                samplerShardSize,
                timeFieldName,
                earliestMs,
                latestMs,
                runtimeMappings
              );
            } else {
              // Will only ever be one document count card,
              // so no value in batching up the single request.
              if (intervalMs !== undefined) {
                const stats = await this.getDocumentCountStats(
                  indexPatternTitle,
                  query,
                  timeFieldName,
                  earliestMs,
                  latestMs,
                  intervalMs,
                  runtimeMappings
                );
                batchStats.push(stats);
              }
            }
            break;
          case ML_JOB_FIELD_TYPES.KEYWORD:
          case ML_JOB_FIELD_TYPES.IP:
            batchStats = await this.getStringFieldsStats(
              indexPatternTitle,
              query,
              batch,
              samplerShardSize,
              timeFieldName,
              earliestMs,
              latestMs,
              runtimeMappings
            );
            break;
          case ML_JOB_FIELD_TYPES.DATE:
            batchStats = await this.getDateFieldsStats(
              indexPatternTitle,
              query,
              batch,
              samplerShardSize,
              timeFieldName,
              earliestMs,
              latestMs,
              runtimeMappings
            );
            break;
          case ML_JOB_FIELD_TYPES.BOOLEAN:
            batchStats = await this.getBooleanFieldsStats(
              indexPatternTitle,
              query,
              batch,
              samplerShardSize,
              timeFieldName,
              earliestMs,
              latestMs,
              runtimeMappings
            );
            break;
          case ML_JOB_FIELD_TYPES.TEXT:
          default:
            // Use an exists filter on the the field name to get
            // examples of the field, so cannot batch up.
            await Promise.all(
              batch.map(async (field) => {
                const stats = await this.getFieldExamples(
                  indexPatternTitle,
                  query,
                  field.fieldName,
                  timeFieldName,
                  earliestMs,
                  latestMs,
                  maxExamples,
                  runtimeMappings
                );
                batchStats.push(stats);
              })
            );
            break;
        }

        results = [...results, ...batchStats];
      })
    );

    return results;
  }

  async checkAggregatableFieldsExist(
    indexPatternTitle: string,
    query: any,
    aggregatableFields: string[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs?: number,
    latestMs?: number,
    datafeedConfig?: Datafeed,
    runtimeMappings?: RuntimeMappings
  ) {
    const index = indexPatternTitle;
    const size = 0;
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);
    const datafeedAggregations = getDatafeedAggregations(datafeedConfig);

    // Value count aggregation faster way of checking if field exists than using
    // filter aggregation with exists query.
    const aggs: Aggs = datafeedAggregations !== undefined ? { ...datafeedAggregations } : {};

    // Combine runtime fields from the index pattern as well as the datafeed
    const combinedRuntimeMappings: RuntimeMappings = {
      ...(isPopulatedObject(runtimeMappings) ? runtimeMappings : {}),
      ...(isPopulatedObject(datafeedConfig) && isPopulatedObject(datafeedConfig.runtime_mappings)
        ? datafeedConfig.runtime_mappings
        : {}),
    };

    aggregatableFields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field, i);
      aggs[`${safeFieldName}_count`] = {
        filter: { exists: { field } },
      };

      let cardinalityField: AggCardinality;
      if (datafeedConfig?.script_fields?.hasOwnProperty(field)) {
        cardinalityField = aggs[`${safeFieldName}_cardinality`] = {
          cardinality: { script: datafeedConfig?.script_fields[field].script },
        };
      } else {
        cardinalityField = {
          cardinality: { field },
        };
      }
      aggs[`${safeFieldName}_cardinality`] = cardinalityField;
    });

    const searchBody = {
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      ...(isPopulatedObject(aggs) ? { aggs: buildSamplerAggregation(aggs, samplerShardSize) } : {}),
      ...(isPopulatedObject(combinedRuntimeMappings)
        ? { runtime_mappings: combinedRuntimeMappings }
        : {}),
    };

    const body = await this._asCurrentUser.search({
      index,
      track_total_hits: true,
      size,
      body: searchBody,
    });

    const aggregations = body.aggregations;
    // @ts-expect-error incorrect search response type
    const totalCount = body.hits.total.value;
    const stats = {
      totalCount,
      aggregatableExistsFields: [] as FieldData[],
      aggregatableNotExistsFields: [] as FieldData[],
    };

    const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
    const sampleCount =
      samplerShardSize > 0 ? get(aggregations, ['sample', 'doc_count'], 0) : totalCount;
    aggregatableFields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field, i);
      const count = get(aggregations, [...aggsPath, `${safeFieldName}_count`, 'doc_count'], 0);
      if (count > 0) {
        const cardinality = get(
          aggregations,
          [...aggsPath, `${safeFieldName}_cardinality`, 'value'],
          0
        );
        stats.aggregatableExistsFields.push({
          fieldName: field,
          existsInDocs: true,
          stats: {
            sampleCount,
            count,
            cardinality,
          },
        });
      } else {
        if (
          datafeedConfig?.script_fields?.hasOwnProperty(field) ||
          datafeedConfig?.runtime_mappings?.hasOwnProperty(field)
        ) {
          const cardinality = get(
            aggregations,
            [...aggsPath, `${safeFieldName}_cardinality`, 'value'],
            0
          );
          stats.aggregatableExistsFields.push({
            fieldName: field,
            existsInDocs: true,
            stats: {
              sampleCount,
              count,
              cardinality,
            },
          });
        } else {
          stats.aggregatableNotExistsFields.push({
            fieldName: field,
            existsInDocs: false,
          });
        }
      }
    });

    return stats;
  }

  async checkNonAggregatableFieldExists(
    indexPatternTitle: string,
    query: any,
    field: string,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: RuntimeMappings
  ) {
    const index = indexPatternTitle;
    const size = 0;
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

    const searchBody = {
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    };
    filterCriteria.push({ exists: { field } });

    const body = await this._asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });
    // @ts-expect-error incorrect search response type
    return body.hits.total.value > 0;
  }

  async getDocumentCountStats(
    indexPatternTitle: string,
    query: any,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    intervalMs: number,
    runtimeMappings: RuntimeMappings
  ): Promise<DocumentCountStats> {
    const index = indexPatternTitle;
    const size = 0;
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

    // Don't use the sampler aggregation as this can lead to some potentially
    // confusing date histogram results depending on the date range of data amongst shards.

    const aggs = {
      eventRate: {
        date_histogram: {
          field: timeFieldName,
          fixed_interval: `${intervalMs}ms`,
          min_doc_count: 1,
        },
      },
    };

    const searchBody = {
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      aggs,
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    };

    const body = await this._asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });

    const buckets: { [key: string]: number } = {};
    const dataByTimeBucket: Array<{ key: string; doc_count: number }> = get(
      body,
      ['aggregations', 'eventRate', 'buckets'],
      []
    );
    each(dataByTimeBucket, (dataForTime) => {
      const time = dataForTime.key;
      buckets[time] = dataForTime.doc_count;
    });

    return {
      documentCounts: {
        interval: intervalMs,
        buckets,
      },
    };
  }

  async getNumericFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: RuntimeMappings
  ) {
    const index = indexPatternTitle;
    const size = 0;
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

    // Build the percents parameter which defines the percentiles to query
    // for the metric distribution data.
    // Use a fixed percentile spacing of 5%.
    const MAX_PERCENT = 100;
    const PERCENTILE_SPACING = 5;
    let count = 0;
    const percents = Array.from(
      Array(MAX_PERCENT / PERCENTILE_SPACING),
      () => (count += PERCENTILE_SPACING)
    );

    const aggs: { [key: string]: any } = {};
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);
      aggs[`${safeFieldName}_field_stats`] = {
        filter: { exists: { field: field.fieldName } },
        aggs: {
          actual_stats: {
            stats: { field: field.fieldName },
          },
        },
      };
      aggs[`${safeFieldName}_percentiles`] = {
        percentiles: {
          field: field.fieldName,
          percents,
          keyed: false,
        },
      };

      const top = {
        terms: {
          field: field.fieldName,
          size: 10,
          order: {
            _count: 'desc',
          },
        },
      };

      // If cardinality >= SAMPLE_TOP_TERMS_THRESHOLD, run the top terms aggregation
      // in a sampler aggregation, even if no sampling has been specified (samplerShardSize < 1).
      if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
        aggs[`${safeFieldName}_top`] = {
          sampler: {
            shard_size: SAMPLER_TOP_TERMS_SHARD_SIZE,
          },
          aggs: {
            top,
          },
        };
      } else {
        aggs[`${safeFieldName}_top`] = top;
      }
    });

    const searchBody = {
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      aggs: buildSamplerAggregation(aggs, samplerShardSize),
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    };

    const body = await this._asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });
    const aggregations = body.aggregations;
    const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
    const batchStats: NumericFieldStats[] = [];
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);
      const docCount = get(
        aggregations,
        [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'],
        0
      );
      const fieldStatsResp = get(
        aggregations,
        [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
        {}
      );

      const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
      if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
        topAggsPath.push('top');
      }

      const topValues: Bucket[] = get(aggregations, [...topAggsPath, 'buckets'], []);

      const stats: NumericFieldStats = {
        fieldName: field.fieldName,
        count: docCount,
        min: get(fieldStatsResp, 'min', 0),
        max: get(fieldStatsResp, 'max', 0),
        avg: get(fieldStatsResp, 'avg', 0),
        isTopValuesSampled:
          field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD || samplerShardSize > 0,
        topValues,
        topValuesSampleSize: topValues.reduce(
          (acc, curr) => acc + curr.doc_count,
          get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
        ),
        topValuesSamplerShardSize:
          field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD
            ? SAMPLER_TOP_TERMS_SHARD_SIZE
            : samplerShardSize,
      };

      if (stats.count > 0) {
        const percentiles = get(
          aggregations,
          [...aggsPath, `${safeFieldName}_percentiles`, 'values'],
          []
        );
        const medianPercentile: { value: number; key: number } | undefined = find(percentiles, {
          key: 50,
        });
        stats.median = medianPercentile !== undefined ? medianPercentile!.value : 0;
        stats.distribution = this.processDistributionData(
          percentiles,
          PERCENTILE_SPACING,
          stats.min
        );
      }

      batchStats.push(stats);
    });

    return batchStats;
  }

  async getStringFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: RuntimeMappings
  ) {
    const index = indexPatternTitle;
    const size = 0;
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

    const aggs: Aggs = {};
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);
      const top = {
        terms: {
          field: field.fieldName,
          size: 10,
          order: {
            _count: 'desc',
          },
        },
      };

      // If cardinality >= SAMPLE_TOP_TERMS_THRESHOLD, run the top terms aggregation
      // in a sampler aggregation, even if no sampling has been specified (samplerShardSize < 1).
      if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
        aggs[`${safeFieldName}_top`] = {
          sampler: {
            shard_size: SAMPLER_TOP_TERMS_SHARD_SIZE,
          },
          aggs: {
            top,
          },
        };
      } else {
        aggs[`${safeFieldName}_top`] = top;
      }
    });

    const searchBody = {
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      aggs: buildSamplerAggregation(aggs, samplerShardSize),
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    };

    const body = await this._asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });
    const aggregations = body.aggregations;
    const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
    const batchStats: StringFieldStats[] = [];
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);

      const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
      if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
        topAggsPath.push('top');
      }

      const topValues: Bucket[] = get(aggregations, [...topAggsPath, 'buckets'], []);

      const stats = {
        fieldName: field.fieldName,
        isTopValuesSampled:
          field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD || samplerShardSize > 0,
        topValues,
        topValuesSampleSize: topValues.reduce(
          (acc, curr) => acc + curr.doc_count,
          get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
        ),
        topValuesSamplerShardSize:
          field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD
            ? SAMPLER_TOP_TERMS_SHARD_SIZE
            : samplerShardSize,
      };

      batchStats.push(stats);
    });

    return batchStats;
  }

  async getDateFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: RuntimeMappings
  ) {
    const index = indexPatternTitle;
    const size = 0;
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

    const aggs: Aggs = {};
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);
      aggs[`${safeFieldName}_field_stats`] = {
        filter: { exists: { field: field.fieldName } },
        aggs: {
          actual_stats: {
            stats: { field: field.fieldName },
          },
        },
      };
    });

    const searchBody = {
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      aggs: buildSamplerAggregation(aggs, samplerShardSize),
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    };

    const body = await this._asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });
    const aggregations = body.aggregations;
    const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
    const batchStats: DateFieldStats[] = [];
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);
      const docCount = get(
        aggregations,
        [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'],
        0
      );
      const fieldStatsResp = get(
        aggregations,
        [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
        {}
      );
      batchStats.push({
        fieldName: field.fieldName,
        count: docCount,
        earliest: get(fieldStatsResp, 'min', 0),
        latest: get(fieldStatsResp, 'max', 0),
      });
    });

    return batchStats;
  }

  async getBooleanFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: RuntimeMappings
  ) {
    const index = indexPatternTitle;
    const size = 0;
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

    const aggs: Aggs = {};
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);
      aggs[`${safeFieldName}_value_count`] = {
        filter: { exists: { field: field.fieldName } },
      };
      aggs[`${safeFieldName}_values`] = {
        terms: {
          field: field.fieldName,
          size: 2,
        },
      };
    });

    const searchBody = {
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      aggs: buildSamplerAggregation(aggs, samplerShardSize),
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    };

    const body = await this._asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });
    const aggregations = body.aggregations;
    const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
    const batchStats: BooleanFieldStats[] = [];
    fields.forEach((field, i) => {
      const safeFieldName = getSafeAggregationName(field.fieldName, i);
      const stats: BooleanFieldStats = {
        fieldName: field.fieldName,
        count: get(aggregations, [...aggsPath, `${safeFieldName}_value_count`, 'doc_count'], 0),
        trueCount: 0,
        falseCount: 0,
      };

      const valueBuckets: Array<{ [key: string]: number }> = get(
        aggregations,
        [...aggsPath, `${safeFieldName}_values`, 'buckets'],
        []
      );
      valueBuckets.forEach((bucket) => {
        stats[`${bucket.key_as_string}Count`] = bucket.doc_count;
      });

      batchStats.push(stats);
    });

    return batchStats;
  }

  async getFieldExamples(
    indexPatternTitle: string,
    query: any,
    field: string,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    maxExamples: number,
    runtimeMappings?: RuntimeMappings
  ): Promise<FieldExamples> {
    const index = indexPatternTitle;

    // Request at least 100 docs so that we have a chance of obtaining
    // 'maxExamples' of the field.
    const size = Math.max(100, maxExamples);
    const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

    // Use an exists filter to return examples of the field.
    filterCriteria.push({
      exists: { field },
    });

    const searchBody = {
      fields: [field],
      _source: false,
      query: {
        bool: {
          filter: filterCriteria,
        },
      },
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    };

    const body = await this._asCurrentUser.search({
      index,
      size,
      body: searchBody,
    });
    const stats = {
      fieldName: field,
      examples: [] as any[],
    };
    // @ts-expect-error incorrect search response type
    if (body.hits.total.value > 0) {
      const hits = body.hits.hits;
      for (let i = 0; i < hits.length; i++) {
        // Use lodash get() to support field names containing dots.
        const doc: object[] | undefined = get(hits[i].fields, field);
        // the results from fields query is always an array
        if (Array.isArray(doc) && doc.length > 0) {
          const example = doc[0];
          if (example !== undefined && stats.examples.indexOf(example) === -1) {
            stats.examples.push(example);
            if (stats.examples.length === maxExamples) {
              break;
            }
          }
        }
      }
    }

    return stats;
  }

  processDistributionData(
    percentiles: Array<{ value: number }>,
    percentileSpacing: number,
    minValue: number
  ): Distribution {
    const distribution: Distribution = { percentiles: [], minPercentile: 0, maxPercentile: 100 };
    if (percentiles.length === 0) {
      return distribution;
    }

    let percentileBuckets: Array<{ value: number }> = [];
    let lowerBound = minValue;
    if (lowerBound >= 0) {
      // By default return results for 0 - 90% percentiles.
      distribution.minPercentile = 0;
      distribution.maxPercentile = 90;
      percentileBuckets = percentiles.slice(0, percentiles.length - 2);

      // Look ahead to the last percentiles and process these too if
      // they don't add more than 50% to the value range.
      const lastValue = (last(percentileBuckets) as any).value;
      const upperBound = lowerBound + 1.5 * (lastValue - lowerBound);
      const filteredLength = percentileBuckets.length;
      for (let i = filteredLength; i < percentiles.length; i++) {
        if (percentiles[i].value < upperBound) {
          percentileBuckets.push(percentiles[i]);
          distribution.maxPercentile += percentileSpacing;
        } else {
          break;
        }
      }
    } else {
      // By default return results for 5 - 95% percentiles.
      const dataMin = lowerBound;
      lowerBound = percentiles[0].value;
      distribution.minPercentile = 5;
      distribution.maxPercentile = 95;
      percentileBuckets = percentiles.slice(1, percentiles.length - 1);

      // Add in 0-5 and 95-100% if they don't add more
      // than 25% to the value range at either end.
      const lastValue: number = (last(percentileBuckets) as any).value;
      const maxDiff = 0.25 * (lastValue - lowerBound);
      if (lowerBound - dataMin < maxDiff) {
        percentileBuckets.splice(0, 0, percentiles[0]);
        distribution.minPercentile = 0;
        lowerBound = dataMin;
      }

      if (percentiles[percentiles.length - 1].value - lastValue < maxDiff) {
        percentileBuckets.push(percentiles[percentiles.length - 1]);
        distribution.maxPercentile = 100;
      }
    }

    // Combine buckets with the same value.
    const totalBuckets = percentileBuckets.length;
    let lastBucketValue = lowerBound;
    let numEqualValueBuckets = 0;
    for (let i = 0; i < totalBuckets; i++) {
      const bucket = percentileBuckets[i];

      // Results from the percentiles aggregation can have precision rounding
      // artifacts e.g returning 200 and 200.000000000123, so check for equality
      // around double floating point precision i.e. 15 sig figs.
      if (bucket.value.toPrecision(15) !== lastBucketValue.toPrecision(15)) {
        // Create a bucket for any 'equal value' buckets which had a value <= last bucket
        if (numEqualValueBuckets > 0) {
          distribution.percentiles.push({
            percent: numEqualValueBuckets * percentileSpacing,
            minValue: lastBucketValue,
            maxValue: lastBucketValue,
          });
        }

        distribution.percentiles.push({
          percent: percentileSpacing,
          minValue: lastBucketValue,
          maxValue: bucket.value,
        });

        lastBucketValue = bucket.value;
        numEqualValueBuckets = 0;
      } else {
        numEqualValueBuckets++;
        if (i === totalBuckets - 1) {
          // If at the last bucket, create a final bucket for the equal value buckets.
          distribution.percentiles.push({
            percent: numEqualValueBuckets * percentileSpacing,
            minValue: lastBucketValue,
            maxValue: lastBucketValue,
          });
        }
      }
    }

    return distribution;
  }
}
