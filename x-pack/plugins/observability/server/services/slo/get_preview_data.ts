/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
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
import { ElasticsearchClient } from '@kbn/core/server';
import { estypes } from '@elastic/elasticsearch';
import { getElasticsearchQueryOrThrow } from './transform_generators';
import { typedSearch } from '../../utils/queries';
import { APMTransactionDurationIndicator } from '../../domain/models';
import { computeSLI } from '../../domain/services';
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
  instanceId?: string;
  groupBy?: string;
}
export class GetPreviewData {
  constructor(private esClient: ElasticsearchClient) {}

  private async getAPMTransactionDurationPreviewData(
    indicator: APMTransactionDurationIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const filter: estypes.QueryDslQueryContainer[] = [];
    if (options.instanceId !== ALL_VALUE && options.groupBy) {
      filter.push({
        term: { [options.groupBy]: options.instanceId },
      });
    }
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
      filter.push(getElasticsearchQueryOrThrow(indicator.params.filter));

    const truncatedThreshold = Math.trunc(indicator.params.threshold * 1000);

    const result = await typedSearch(this.esClient, {
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
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
          },
          aggs: {
            _good: {
              range: {
                field: 'transaction.duration.histogram',
                keyed: true,
                ranges: [{ to: truncatedThreshold, key: 'target' }],
              },
            },
            good: {
              bucket_script: {
                buckets_path: {
                  _good: `_good['target']>_count`,
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

    return (
      result.aggregations?.perMinute.buckets.map((bucket) => {
        const good = (bucket.good?.value as number) ?? 0;
        const total = bucket.total?.value ?? 0;
        return {
          date: bucket.key_as_string,
          sliValue: computeSLI(good, total),
          events: {
            good,
            total,
            bad: total - good,
          },
        };
      }) ?? []
    );
  }

  private async getAPMTransactionErrorPreviewData(
    indicator: APMTransactionErrorRateIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const filter: estypes.QueryDslQueryContainer[] = [];
    if (options.instanceId !== ALL_VALUE && options.groupBy) {
      filter.push({
        term: { [options.groupBy]: options.instanceId },
      });
    }
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
      filter.push(getElasticsearchQueryOrThrow(indicator.params.filter));

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
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
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
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const timestampField = indicator.params.timestampField;

    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];

    if (options.instanceId !== ALL_VALUE && options.groupBy) {
      filter.push({
        term: { [options.groupBy]: options.instanceId },
      });
    }

    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
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
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(indicator);

    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];
    if (options.instanceId !== ALL_VALUE && options.groupBy) {
      filter.push({
        term: { [options.groupBy]: options.instanceId },
      });
    }

    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
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
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(
      indicator
    );

    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];

    if (options.instanceId !== ALL_VALUE && options.groupBy) {
      filter.push({
        term: { [options.groupBy]: options.instanceId },
      });
    }

    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
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
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const goodQuery = getElasticsearchQueryOrThrow(indicator.params.good);
    const totalQuery = getElasticsearchQueryOrThrow(indicator.params.total);
    const timestampField = indicator.params.timestampField;
    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
      filterQuery,
    ];

    if (options.instanceId !== ALL_VALUE && options.groupBy) {
      filter.push({
        term: { [options.groupBy]: options.instanceId },
      });
    }

    const result = await this.esClient.search({
      index: indicator.params.index,
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: timestampField,
            fixed_interval: options.interval,
            extended_bounds: {
              min: options.range.start,
              max: options.range.end,
            },
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
      // If the time range is 24h or less, then we want to use a 1m bucket for the
      // Timeslice metric so that the chart is as close to the evaluation as possible.
      // Otherwise due to how the statistics work, the values might not look like
      // they've breached the threshold.
      const bucketSize =
        params.indicator.type === 'sli.metric.timeslice' &&
        params.range.end - params.range.start <= 86_400_000 &&
        params.objective?.timesliceWindow
          ? params.objective.timesliceWindow.asMinutes()
          : Math.max(
              calculateAuto
                .near(100, moment.duration(params.range.end - params.range.start, 'ms'))
                ?.asMinutes() ?? 0,
              1
            );
      const options: Options = {
        instanceId: params.instanceId,
        range: params.range,
        groupBy: params.groupBy,
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
