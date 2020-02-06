/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import DateMath from '@elastic/datemath';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';
import { ESSearchResponse } from '../../../apm/typings/elasticsearch';
import { FieldStatsResponse, BASE_API_URL } from '../../common';

const SHARD_SIZE = 5000;

export async function initFieldsRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: `${BASE_API_URL}/index_stats/{indexPatternTitle}/field`,
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        body: schema.object(
          {
            dslQuery: schema.object({}, { allowUnknowns: true }),
            fromDate: schema.string(),
            toDate: schema.string(),
            timeFieldName: schema.maybe(schema.string()),
            field: schema.object(
              {
                name: schema.string(),
                type: schema.string(),
                esTypes: schema.maybe(schema.arrayOf(schema.string())),
              },
              { allowUnknowns: true }
            ),
          },
          { allowUnknowns: true }
        ),
      },
    },
    async (context, req, res) => {
      const requestClient = context.core.elasticsearch.dataClient;
      const { fromDate, toDate, timeFieldName, field, dslQuery } = req.body;

      try {
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

        const search = (aggs: unknown) =>
          requestClient.callAsCurrentUser('search', {
            index: req.params.indexPatternTitle,
            body: {
              query,
              aggs,
            },
            // The hits total changed in 7.0 from number to object, unless this flag is set
            // this is a workaround for elasticsearch response types that are from 6.x
            restTotalHitsAsInt: true,
            size: 0,
          });

        if (field.type === 'number') {
          return res.ok({
            body: await getNumberHistogram(search, field),
          });
        } else if (field.type === 'string') {
          return res.ok({
            body: await getStringSamples(search, field),
          });
        } else if (field.type === 'date') {
          return res.ok({
            body: await getDateHistogram(search, field, { fromDate, toDate }),
          });
        } else if (field.type === 'boolean') {
          return res.ok({
            body: await getStringSamples(search, field),
          });
        }

        return res.ok({});
      } catch (e) {
        if (e.status === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          return res.internalError(e.output.message);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}

export async function getNumberHistogram(
  aggSearchWithBody: (body: unknown) => Promise<unknown>,
  field: { name: string; type: string; esTypes?: string[] }
): Promise<FieldStatsResponse> {
  const searchBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        min_value: {
          min: { field: field.name },
        },
        max_value: {
          max: { field: field.name },
        },
        sample_count: { value_count: { field: field.name } },
        top_values: {
          terms: { field: field.name, size: 10 },
        },
      },
    },
  };

  const minMaxResult = (await aggSearchWithBody(searchBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof searchBody } },
    { restTotalHitsAsInt: true }
  >;

  const minValue = minMaxResult.aggregations!.sample.min_value.value;
  const maxValue = minMaxResult.aggregations!.sample.max_value.value;
  const terms = minMaxResult.aggregations!.sample.top_values;
  const topValuesBuckets = {
    buckets: terms.buckets.map(bucket => ({
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
      totalDocuments: minMaxResult.hits.total,
      sampledValues: minMaxResult.aggregations!.sample.sample_count.value!,
      sampledDocuments: minMaxResult.aggregations!.sample.doc_count,
      topValues: topValuesBuckets,
      histogram: { buckets: [] },
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
    { body: { aggs: typeof histogramBody } },
    { restTotalHitsAsInt: true }
  >;

  return {
    totalDocuments: minMaxResult.hits.total,
    sampledDocuments: minMaxResult.aggregations!.sample.doc_count,
    sampledValues: minMaxResult.aggregations!.sample.sample_count.value!,
    histogram: {
      buckets: histogramResult.aggregations!.sample.histo.buckets.map(bucket => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
    topValues: topValuesBuckets,
  };
}

export async function getStringSamples(
  aggSearchWithBody: (body: unknown) => unknown,
  field: { name: string; type: string }
): Promise<FieldStatsResponse> {
  const topValuesBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        sample_count: { value_count: { field: field.name } },
        top_values: {
          terms: { field: field.name, size: 10 },
        },
      },
    },
  };
  const topValuesResult = (await aggSearchWithBody(topValuesBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof topValuesBody } },
    { restTotalHitsAsInt: true }
  >;

  return {
    totalDocuments: topValuesResult.hits.total,
    sampledDocuments: topValuesResult.aggregations!.sample.doc_count,
    sampledValues: topValuesResult.aggregations!.sample.sample_count.value!,
    topValues: {
      buckets: topValuesResult.aggregations!.sample.top_values.buckets.map(bucket => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
  };
}

// This one is not sampled so that it returns the full date range
export async function getDateHistogram(
  aggSearchWithBody: (body: unknown) => unknown,
  field: { name: string; type: string },
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
    histo: { date_histogram: { field: field.name, fixed_interval: fixedInterval } },
  };
  const results = (await aggSearchWithBody(histogramBody)) as ESSearchResponse<
    unknown,
    { body: { aggs: typeof histogramBody } },
    { restTotalHitsAsInt: true }
  >;

  return {
    totalDocuments: results.hits.total,
    histogram: {
      buckets: results.aggregations!.histo.buckets.map(bucket => ({
        count: bucket.doc_count,
        key: bucket.key,
      })),
    },
  };
}
