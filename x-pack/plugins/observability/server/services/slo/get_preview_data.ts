/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
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
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import { APMTransactionDurationIndicator } from '../../domain/models';
import { computeSLI } from '../../domain/services';
import { InvalidQueryError } from '../../errors';
import {
  GetCustomMetricIndicatorAggregation,
  GetHistogramIndicatorAggregation,
  GetTimesliceMetricIndicatorAggregation,
} from './aggregations';

interface Options {
  range: {
    start: number;
    end: number;
  };
  interval: string;
}
export class GetPreviewData {
  constructor(private esClient: ElasticsearchClient) {}

  private async getAPMTransactionDurationPreviewData(
    indicator: APMTransactionDurationIndicator,
    options: Options
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
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: options.range.start, lte: options.range.end } } },
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
            fixed_interval: options.interval,
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
      events: {
        good: bucket.good?.value ?? 0,
        bad: (bucket.total?.value ?? 0) - (bucket.good?.value ?? 0),
        total: bucket.total?.value ?? 0,
      },
    }));
  }

  private async getAPMTransactionErrorPreviewData(
    indicator: APMTransactionErrorRateIndicator,
    options: Options
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
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: options.range.start, lte: options.range.end } } },
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
            fixed_interval: options.interval,
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
      events: {
        good: bucket.good?.doc_count ?? 0,
        bad: (bucket.total?.doc_count ?? 0) - (bucket.good?.doc_count ?? 0),
        total: bucket.total?.doc_count ?? 0,
      },
    }));
  }

  private async getHistogramPreviewData(
    indicator: HistogramIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(indicator);
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const timestampField = indicator.params.timestampField;
    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
            filterQuery,
          ],
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
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
    });

    // @ts-ignore buckets is not improperly typed
    return result.aggregations?.perMinute.buckets.map((bucket) => ({
      date: bucket.key_as_string,
      sliValue:
        !!bucket.good && !!bucket.total ? computeSLI(bucket.good.value, bucket.total.value) : null,
      events: {
        good: bucket.good?.value ?? 0,
        bad: (bucket.total?.value ?? 0) - (bucket.good?.value ?? 0),
        total: bucket.total?.value ?? 0,
      },
    }));
  }

  private async getCustomMetricPreviewData(
    indicator: MetricCustomIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(indicator);
    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
            filterQuery,
          ],
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
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
      events: {
        good: bucket.good?.value ?? 0,
        bad: (bucket.total?.value ?? 0) - (bucket.good?.value ?? 0),
        total: bucket.total?.value ?? 0,
      },
    }));
  }

  private async getTimesliceMetricPreviewData(
    indicator: TimesliceMetricIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(
      indicator
    );
    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
            filterQuery,
          ],
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
          },
          aggs: {
            ...getCustomMetricIndicatorAggregation.execute('metric'),
          },
        },
      },
    });

    // @ts-ignore buckets is not improperly typed
    return result.aggregations?.perMinute.buckets.map((bucket) => ({
      date: bucket.key_as_string,
      sliValue: !!bucket.metric ? bucket.metric.value : null,
    }));
  }

  private async getCustomKQLPreviewData(
    indicator: KQLCustomIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const goodQuery = getElastichsearchQueryOrThrow(indicator.params.good);
    const totalQuery = getElastichsearchQueryOrThrow(indicator.params.total);
    const timestampField = indicator.params.timestampField;
    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
            filterQuery,
          ],
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
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
      events: {
        good: bucket.good?.doc_count ?? 0,
        bad: (bucket.total?.doc_count ?? 0) - (bucket.good?.doc_count ?? 0),
        total: bucket.total?.doc_count ?? 0,
      },
    }));
  }

  public async execute(params: GetPreviewDataParams): Promise<GetPreviewDataResponse> {
    try {
      const bucketSize = Math.max(
        calculateAuto
          .near(100, moment.duration(params.range.end - params.range.start, 'ms'))
          ?.asMinutes() ?? 0,
        1
      );
      const options: Options = {
        range: params.range,
        interval: `${bucketSize}m`,
      };

      const type = params.indicator.type;
      switch (type) {
        case 'sli.apm.transactionDuration':
          return this.getAPMTransactionDurationPreviewData(params.indicator, options);
        case 'sli.apm.transactionErrorRate':
          return this.getAPMTransactionErrorPreviewData(params.indicator, options);
        case 'sli.kql.custom':
          return this.getCustomKQLPreviewData(params.indicator, options);
        case 'sli.histogram.custom':
          return this.getHistogramPreviewData(params.indicator, options);
        case 'sli.metric.custom':
          return this.getCustomMetricPreviewData(params.indicator, options);
        case 'sli.metric.timeslice':
          return this.getTimesliceMetricPreviewData(params.indicator, options);
        default:
          assertNever(type);
      }
    } catch (err) {
      return [];
    }
  }
}

function getElastichsearchQueryOrThrow(kuery: string | undefined = '') {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidQueryError(`Invalid kuery: ${kuery}`);
  }
}
