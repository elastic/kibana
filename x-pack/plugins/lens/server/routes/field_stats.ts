/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors, estypes } from '@elastic/elasticsearch';
import DateMath from '@elastic/datemath';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';
import type { IndexPatternField } from 'src/plugins/data/common';
import { isSavedObjectNotFoundError } from '../../../../../src/plugins/kibana_utils/common';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { FieldStatsResponse, BASE_API_URL } from '../../common';
import { PluginStartContract } from '../plugin';

const SHARD_SIZE = 5000;

export async function initFieldsRoute(setup: CoreSetup<PluginStartContract>) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: `${BASE_API_URL}/index_stats/{indexPatternId}/field`,
      validate: {
        params: schema.object({
          indexPatternId: schema.string(),
        }),
        body: schema.object(
          {
            dslQuery: schema.object({}, { unknowns: 'allow' }),
            fromDate: schema.string(),
            toDate: schema.string(),
            fieldName: schema.string(),
            size: schema.maybe(schema.number()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, req, res) => {
      const requestClient = context.core.elasticsearch.client.asCurrentUser;
      const { fromDate, toDate, fieldName, dslQuery, size } = req.body;

      const [{ savedObjects, elasticsearch }, { data }] = await setup.getStartServices();
      const savedObjectsClient = savedObjects.getScopedClient(req);
      const esClient = elasticsearch.client.asScoped(req).asCurrentUser;
      const indexPatternsService = await data.indexPatterns.indexPatternsServiceFactory(
        savedObjectsClient,
        esClient
      );

      try {
        const indexPattern = await indexPatternsService.get(req.params.indexPatternId);

        const timeFieldName = indexPattern.timeFieldName;
        const field = indexPattern.fields.find((f) => f.name === fieldName);

        if (!field) {
          throw new Error(`Field {fieldName} not found in index pattern ${indexPattern.title}`);
        }

        const filter = timeFieldName
          ? [
              {
                range: {
                  [timeFieldName]: {
                    gte: fromDate,
                    lte: toDate,
                  },
                },
              },
              dslQuery,
            ]
          : [dslQuery];

        const query = {
          bool: {
            filter,
          },
        };

        const runtimeMappings = indexPattern.fields
          .filter((f) => f.runtimeField)
          .reduce((acc, f) => {
            if (!f.runtimeField) return acc;
            acc[f.name] = f.runtimeField;
            return acc;
          }, {} as Record<string, estypes.MappingRuntimeField>);

        const search = async (aggs: Record<string, estypes.AggregationsAggregationContainer>) => {
          const { body: result } = await requestClient.search({
            index: indexPattern.title,
            track_total_hits: true,
            body: {
              query,
              aggs,
              runtime_mappings: runtimeMappings,
            },
            size: 0,
          });
          return result;
        };

        if (field.type.includes('range')) {
          return res.ok({ body: {} });
        }

        if (field.type === 'histogram') {
          return res.ok({
            body: await getNumberHistogram(search, field, false),
          });
        } else if (field.type === 'number') {
          return res.ok({
            body: await getNumberHistogram(search, field),
          });
        } else if (field.type === 'date') {
          return res.ok({
            body: await getDateHistogram(search, field, { fromDate, toDate }),
          });
        }

        return res.ok({
          body: await getStringSamples(search, field, size),
        });
      } catch (e) {
        if (isSavedObjectNotFoundError(e)) {
          return res.notFound();
        }
        if (e instanceof errors.ResponseError && e.statusCode === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          throw new Error(e.output.message);
        } else {
          throw e;
        }
      }
    }
  );
}

export async function getNumberHistogram(
  aggSearchWithBody: (
    aggs: Record<string, estypes.AggregationsAggregationContainer>
  ) => Promise<unknown>,
  field: IndexPatternField,
  useTopHits = true
): Promise<FieldStatsResponse> {
  const fieldRef = getFieldRef(field);

  const baseAggs = {
    min_value: {
      min: { field: field.name },
    },
    max_value: {
      max: { field: field.name },
    },
    sample_count: { value_count: { ...fieldRef } },
  };
  const searchWithoutHits = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: { ...baseAggs },
    },
  };
  const searchWithHits = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        ...baseAggs,
        top_values: {
          terms: { ...fieldRef, size: 10 },
        },
      },
    },
  };

  const minMaxResult = (await aggSearchWithBody(
    useTopHits ? searchWithHits : searchWithoutHits
  )) as
    | ESSearchResponse<unknown, { body: { aggs: typeof searchWithHits } }>
    | ESSearchResponse<unknown, { body: { aggs: typeof searchWithoutHits } }>;

  const minValue = minMaxResult.aggregations!.sample.min_value.value;
  const maxValue = minMaxResult.aggregations!.sample.max_value.value;
  const terms =
    'top_values' in minMaxResult.aggregations!.sample
      ? minMaxResult.aggregations!.sample.top_values
      : {
          buckets: [] as Array<{ doc_count: number; key: string | number }>,
        };

  const topValuesBuckets = {
    buckets: terms.buckets.map((bucket) => ({
      count: bucket.doc_count,
      key: bucket.key,
    })),
  };

  let histogramInterval = (maxValue! - minValue!) / 10;

  if (Number.isInteger(minValue!) && Number.isInteger(maxValue!)) {
    histogramInterval = Math.ceil(histogramInterval);
  }

  if (histogramInterval === 0) {
    return {
      totalDocuments: minMaxResult.hits.total.value,
      sampledValues: minMaxResult.aggregations!.sample.sample_count.value!,
      sampledDocuments: minMaxResult.aggregations!.sample.doc_count,
      topValues: topValuesBuckets,
      histogram: useTopHits
        ? { buckets: [] }
        : {
            // Insert a fake bucket for a single-value histogram
            buckets: [{ count: minMaxResult.aggregations!.sample.doc_count, key: minValue }],
          },
    };
  }

  const histogramBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        histo: {
          histogram: {
            field: field.name,
            interval: histogramInterval,
          },
        },
      },
    },
  };
  const histogramResult = (await aggSearchWithBody(histogramBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof histogramBody } }
  >;

  return {
    totalDocuments: minMaxResult.hits.total.value,
    sampledDocuments: minMaxResult.aggregations!.sample.doc_count,
    sampledValues: minMaxResult.aggregations!.sample.sample_count.value!,
    histogram: {
      buckets: histogramResult.aggregations!.sample.histo.buckets.map((bucket) => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
    topValues: topValuesBuckets,
  };
}

export async function getStringSamples(
  aggSearchWithBody: (aggs: Record<string, estypes.AggregationsAggregationContainer>) => unknown,
  field: IndexPatternField,
  size = 10
): Promise<FieldStatsResponse> {
  const fieldRef = getFieldRef(field);

  const topValuesBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        sample_count: { value_count: { ...fieldRef } },
        top_values: {
          terms: {
            ...fieldRef,
            size,
          },
        },
      },
    },
  };
  const topValuesResult = (await aggSearchWithBody(topValuesBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof topValuesBody } }
  >;

  return {
    totalDocuments: topValuesResult.hits.total.value,
    sampledDocuments: topValuesResult.aggregations!.sample.doc_count,
    sampledValues: topValuesResult.aggregations!.sample.sample_count.value!,
    topValues: {
      buckets: topValuesResult.aggregations!.sample.top_values.buckets.map((bucket) => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
  };
}

// This one is not sampled so that it returns the full date range
export async function getDateHistogram(
  aggSearchWithBody: (aggs: Record<string, estypes.AggregationsAggregationContainer>) => unknown,
  field: IndexPatternField,
  range: { fromDate: string; toDate: string }
): Promise<FieldStatsResponse> {
  const fromDate = DateMath.parse(range.fromDate);
  const toDate = DateMath.parse(range.toDate);
  if (!fromDate) {
    throw Error('Invalid fromDate value');
  }
  if (!toDate) {
    throw Error('Invalid toDate value');
  }

  const interval = Math.round((toDate.valueOf() - fromDate.valueOf()) / 10);
  if (interval < 1) {
    return {
      totalDocuments: 0,
      histogram: { buckets: [] },
    };
  }

  // TODO: Respect rollup intervals
  const fixedInterval = `${interval}ms`;

  const histogramBody = {
    histo: { date_histogram: { ...getFieldRef(field), fixed_interval: fixedInterval } },
  };
  const results = (await aggSearchWithBody(histogramBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof histogramBody } }
  >;

  return {
    totalDocuments: results.hits.total.value,
    histogram: {
      buckets: results.aggregations!.histo.buckets.map((bucket) => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
  };
}

function getFieldRef(field: IndexPatternField) {
  return field.scripted
    ? {
        script: {
          lang: field.lang!,
          source: field.script as string,
        },
      }
    : { field: field.name };
}
