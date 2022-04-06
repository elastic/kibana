/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { get } from 'lodash';
import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/server';
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

interface Aggs {
  [key: string]: any;
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
}
