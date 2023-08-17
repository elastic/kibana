/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import {
  ALL_VALUE,
  APMTransactionErrorRateIndicator,
  GetPreviewDataParams,
  GetPreviewDataResponse,
  HistogramIndicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
} from '@kbn/slo-schema';
import { APMTransactionDurationIndicator } from '../../domain/models';
import { computeSLI } from '../../domain/services';
import { InvalidQueryError } from '../../errors';
import {
  GetHistogramIndicatorAggregation,
  GetCustomMetricIndicatorAggregation,
} from './aggregations';

export class GetPreviewData {
  constructor(private esClient: ElasticsearchClient) {}

  private async getAPMTransactionDurationPreviewData(
    indicator: APMTransactionDurationIndicator
  ): Promise<GetPreviewDataResponse> {
    const filter = [];
    if (indicator.params.service !== ALL_VALUE)
      filter.push({
        match: { 'service.name': indicator.params.service },
      });
    if (indicator.params.environment !== ALL_VALUE)
      filter.push({
        match: { 'service.environment': indicator.params.environment },
      });
    if (indicator.params.transactionName !== ALL_VALUE)
      filter.push({
        match: { 'transaction.name': indicator.params.transactionName },
      });
    if (indicator.params.transactionType !== ALL_VALUE)
      filter.push({
        match: { 'transaction.type': indicator.params.transactionType },
      });
    if (!!indicator.params.filter)
      filter.push(getElastichsearchQueryOrThrow(indicator.params.filter));

    const truncatedThreshold = Math.trunc(indicator.params.threshold * 1000);

    const result = await this.esClient.search({
      index: indicator.params.index,
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
        !!bucket.good && !!bucket.total ? computeSLI(bucket.good.value, bucket.total.value) : null,
    }));
  }

  private async getAPMTransactionErrorPreviewData(
    indicator: APMTransactionErrorRateIndicator
  ): Promise<GetPreviewDataResponse> {
    const filter = [];
    if (indicator.params.service !== ALL_VALUE)
      filter.push({
        match: { 'service.name': indicator.params.service },
      });
    if (indicator.params.environment !== ALL_VALUE)
      filter.push({
        match: { 'service.environment': indicator.params.environment },
      });
    if (indicator.params.transactionName !== ALL_VALUE)
      filter.push({
        match: { 'transaction.name': indicator.params.transactionName },
      });
    if (indicator.params.transactionType !== ALL_VALUE)
      filter.push({
        match: { 'transaction.type': indicator.params.transactionType },
      });
    if (!!indicator.params.filter)
      filter.push(getElastichsearchQueryOrThrow(indicator.params.filter));

    const result = await this.esClient.search({
      index: indicator.params.index,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: 'now-60m' } } },
            { term: { 'metricset.name': 'transaction' } },
            { terms: { 'event.outcome': ['success', 'failure'] } },
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
              filter: {
                match_all: {},
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
          ? computeSLI(bucket.good.doc_count, bucket.total.doc_count)
          : null,
    }));
  }

  private async getHistogramPreviewData(
    indicator: HistogramIndicator
  ): Promise<GetPreviewDataResponse> {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(indicator);
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const timestampField = indicator.params.timestampField;
    const options = {
      index: indicator.params.index,
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
            ...getHistogramIndicatorAggregations.execute({
              type: 'good',
              aggregationKey: 'good',
            }),
            ...getHistogramIndicatorAggregations.execute({
              type: 'total',
              aggregationKey: 'total',
            }),
          },
        },
      },
    };
    const result = await this.esClient.search(options);

    // @ts-ignore buckets is not improperly typed
    return result.aggregations?.perMinute.buckets.map((bucket) => ({
      date: bucket.key_as_string,
      sliValue:
        !!bucket.good && !!bucket.total ? computeSLI(bucket.good.value, bucket.total.value) : null,
    }));
  }

  private async getCustomMetricPreviewData(
    indicator: MetricCustomIndicator
  ): Promise<GetPreviewDataResponse> {
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(indicator);
    const result = await this.esClient.search({
      index: indicator.params.index,
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
        !!bucket.good && !!bucket.total ? computeSLI(bucket.good.value, bucket.total.value) : null,
    }));
  }

  private async getCustomKQLPreviewData(
    indicator: KQLCustomIndicator
  ): Promise<GetPreviewDataResponse> {
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const goodQuery = getElastichsearchQueryOrThrow(indicator.params.good);
    const totalQuery = getElastichsearchQueryOrThrow(indicator.params.total);
    const timestampField = indicator.params.timestampField;
    const result = await this.esClient.search({
      index: indicator.params.index,
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
  }

  public async execute(params: GetPreviewDataParams): Promise<GetPreviewDataResponse> {
    switch (params.indicator.type) {
      case 'sli.apm.transactionDuration':
        return this.getAPMTransactionDurationPreviewData(params.indicator);
      case 'sli.apm.transactionErrorRate':
        return this.getAPMTransactionErrorPreviewData(params.indicator);
      case 'sli.kql.custom':
        return this.getCustomKQLPreviewData(params.indicator);
      case 'sli.histogram.custom':
        return this.getHistogramPreviewData(params.indicator);
      case 'sli.metric.custom':
        return this.getCustomMetricPreviewData(params.indicator);
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
