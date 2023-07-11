/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { ALL_VALUE, GetPreviewDataParams, GetPreviewDataResponse } from '@kbn/slo-schema';
import { computeSLI } from '../../domain/services';
import { InvalidQueryError } from '../../errors';
import { GetCustomMetricIndicatorAggregation } from './aggregations';

export class GetPreviewData {
  constructor(private esClient: ElasticsearchClient) {}

  public async execute(params: GetPreviewDataParams): Promise<GetPreviewDataResponse> {
    switch (params.indicator.type) {
      case 'sli.apm.transactionDuration':
        try {
          const filter = [];
          if (params.indicator.params.service !== ALL_VALUE)
            filter.push({
              match: { 'service.name': params.indicator.params.service },
            });
          if (params.indicator.params.environment !== ALL_VALUE)
            filter.push({
              match: { 'service.environment': params.indicator.params.environment },
            });
          if (params.indicator.params.transactionName !== ALL_VALUE)
            filter.push({
              match: { 'transaction.name': params.indicator.params.transactionName },
            });
          if (params.indicator.params.transactionType !== ALL_VALUE)
            filter.push({
              match: { 'transaction.type': params.indicator.params.transactionType },
            });
          if (!!params.indicator.params.filter)
            filter.push(getElastichsearchQueryOrThrow(params.indicator.params.filter));

          const truncatedThreshold = Math.trunc(params.indicator.params.threshold * 1000);

          const result = await this.esClient.search({
            index: params.indicator.params.index,
            query: {
              bool: {
                filter: [
                  { range: { '@timestamp': { gte: 'now-60m' } } },
                  { terms: { 'processor.event': ['metric'] } },
                  { term: { 'metricset.name': 'transaction' } },
                  { exists: { field: 'transaction.duration.histogram' } },
                  ...filter,
                ],
              },
            },
            aggs: {
              perMinute: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: '1m',
                },
                aggs: {
                  _good: {
                    range: {
                      field: 'transaction.duration.histogram',
                      ranges: [{ to: truncatedThreshold }],
                    },
                  },
                  good: {
                    bucket_script: {
                      buckets_path: {
                        _good: `_good['*-${truncatedThreshold}.0']>_count`,
                      },
                      script: 'params._good',
                    },
                  },
                  total: {
                    value_count: {
                      field: 'transaction.duration.histogram',
                    },
                  },
                },
              },
            },
          });

          // @ts-ignore buckets is not improperly typed
          return result.aggregations?.perMinute.buckets.map((bucket) => ({
            date: bucket.key_as_string,
            sliValue:
              !!bucket.good && !!bucket.total
                ? computeSLI(bucket.good.value, bucket.total.value)
                : null,
          }));
        } catch (err) {
          throw new InvalidQueryError(`Invalid ES query`);
        }
      case 'sli.apm.transactionErrorRate':
        try {
          const filter = [];
          if (params.indicator.params.service !== ALL_VALUE)
            filter.push({
              match: { 'service.name': params.indicator.params.service },
            });
          if (params.indicator.params.environment !== ALL_VALUE)
            filter.push({
              match: { 'service.environment': params.indicator.params.environment },
            });
          if (params.indicator.params.transactionName !== ALL_VALUE)
            filter.push({
              match: { 'transaction.name': params.indicator.params.transactionName },
            });
          if (params.indicator.params.transactionType !== ALL_VALUE)
            filter.push({
              match: { 'transaction.type': params.indicator.params.transactionType },
            });
          if (!!params.indicator.params.filter)
            filter.push(getElastichsearchQueryOrThrow(params.indicator.params.filter));

          const result = await this.esClient.search({
            index: params.indicator.params.index,
            query: {
              bool: {
                filter: [
                  { range: { '@timestamp': { gte: 'now-60m' } } },
                  { terms: { 'processor.event': ['metric'] } },
                  { term: { 'metricset.name': 'transaction' } },
                  { exists: { field: 'transaction.duration.histogram' } },
                  { exists: { field: 'transaction.result' } },
                  ...filter,
                ],
              },
            },
            aggs: {
              perMinute: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: '1m',
                },
                aggs: {
                  good: {
                    filter: {
                      bool: {
                        should: {
                          match: {
                            'event.outcome': 'success',
                          },
                        },
                      },
                    },
                  },
                  total: {
                    value_count: {
                      field: 'transaction.duration.histogram',
                    },
                  },
                },
              },
            },
          });

          // @ts-ignore buckets is not improperly typed
          return result.aggregations?.perMinute.buckets.map((bucket) => ({
            date: bucket.key_as_string,
            sliValue:
              !!bucket.good && !!bucket.total
                ? computeSLI(bucket.good.doc_count, bucket.total.value)
                : null,
          }));
        } catch (err) {
          throw new InvalidQueryError(`Invalid ES query`);
        }
      case 'sli.kql.custom':
        try {
          const filterQuery = getElastichsearchQueryOrThrow(params.indicator.params.filter);
          const goodQuery = getElastichsearchQueryOrThrow(params.indicator.params.good);
          const totalQuery = getElastichsearchQueryOrThrow(params.indicator.params.total);
          const timestampField = params.indicator.params.timestampField;
          const result = await this.esClient.search({
            index: params.indicator.params.index,
            query: {
              bool: {
                filter: [{ range: { [timestampField]: { gte: 'now-60m' } } }, filterQuery],
              },
            },
            aggs: {
              perMinute: {
                date_histogram: {
                  field: timestampField,
                  fixed_interval: '1m',
                },
                aggs: {
                  good: { filter: goodQuery },
                  total: { filter: totalQuery },
                },
              },
            },
          });

          // @ts-ignore buckets is not improperly typed
          return result.aggregations?.perMinute.buckets.map((bucket) => ({
            date: bucket.key_as_string,
            sliValue:
              !!bucket.good && !!bucket.total
                ? computeSLI(bucket.good.doc_count, bucket.total.doc_count)
                : null,
          }));
        } catch (err) {
          throw new InvalidQueryError(`Invalid ES query`);
        }
      case 'sli.metric.custom':
        const timestampField = params.indicator.params.timestampField;
        const filterQuery = getElastichsearchQueryOrThrow(params.indicator.params.filter);
        const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(
          params.indicator
        );
        const result = await this.esClient.search({
          index: params.indicator.params.index,
          query: {
            bool: {
              filter: [{ range: { [timestampField]: { gte: 'now-60m' } } }, filterQuery],
            },
          },
          aggs: {
            perMinute: {
              date_histogram: {
                field: timestampField,
                fixed_interval: '1m',
              },
              aggs: {
                ...getCustomMetricIndicatorAggregation.execute({
                  type: 'good',
                  aggregationKey: 'good',
                }),
                ...getCustomMetricIndicatorAggregation.execute({
                  type: 'total',
                  aggregationKey: 'total',
                }),
              },
            },
          },
        });

        // @ts-ignore buckets is not improperly typed
        return result.aggregations?.perMinute.buckets.map((bucket) => ({
          date: bucket.key_as_string,
          sliValue:
            !!bucket.good && !!bucket.total
              ? computeSLI(bucket.good.value, bucket.total.value)
              : null,
        }));

      default:
        return [];
    }
  }
}

function getElastichsearchQueryOrThrow(kuery: string) {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidQueryError(`Invalid kuery: ${kuery}`);
  }
}
