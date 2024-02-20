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
  GetPreviewDataByGroupResponse,
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
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getElasticsearchQueryOrThrow } from './transform_generators';
import { typedSearch } from '../../utils/queries';
import { APMTransactionDurationIndicator } from '../../domain/models';
import { computeSLI } from '../../domain/services';
import {
  GetCustomMetricIndicatorAggregation,
  GetHistogramIndicatorAggregation,
  GetTimesliceMetricIndicatorAggregation,
} from './aggregations';

type PreviewData = Promise<GetPreviewDataResponse | GetPreviewDataByGroupResponse>;

interface Options {
  range: {
    start: number;
    end: number;
  };
  interval: string;
  instanceId?: string;
  groupBy?: string;
  groupBySampleSize?: number;
}
interface ValueNumber {
  value: number;
}
export class GetPreviewData {
  constructor(private esClient: ElasticsearchClient) {}

  hasGroupBy = (options: Options) => {
    return options.groupBy && options.instanceId !== ALL_VALUE && options.groupBy !== ALL_VALUE;
  };

  groupByAgg = (options: Options) => {
    return {
      field: options.groupBy,
      size: options.groupBySampleSize,
    };
  };

  getBaseFilters = (
    timestampField: string,
    options: Options,
    queryFilter?: QueryDslQueryContainer
  ) => {
    const filter: estypes.QueryDslQueryContainer[] = [
      { range: { [timestampField]: { gte: options.range.start, lte: options.range.end } } },
    ];

    if (queryFilter) {
      filter.push(queryFilter);
    }

    if (
      options.instanceId &&
      options.groupBy &&
      options.instanceId !== ALL_VALUE &&
      options.groupBy !== ALL_VALUE
    ) {
      filter.push({
        term: { [options.groupBy!]: options.instanceId },
      });
    }
    return filter;
  };

  processBucket = (bucket: { key_as_string: string; good: ValueNumber; total: ValueNumber }) => {
    const good = (bucket.good as ValueNumber)?.value ?? 0;
    const total = (bucket.total as ValueNumber)?.value ?? 0;
    return {
      date: bucket.key_as_string,
      sliValue: !!bucket.good && !!bucket.total ? computeSLI(good, total) : null,
      events: {
        good,
        total,
        bad: total - good,
      },
    };
  };

  getAPMFilters = (
    indicator: APMTransactionErrorRateIndicator | APMTransactionDurationIndicator,
    options: Options
  ) => {
    const filter: estypes.QueryDslQueryContainer[] = this.getBaseFilters('@timestamp', options);

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

    return filter;
  };

  private async getAPMTransactionDurationPreviewData(
    indicator: APMTransactionDurationIndicator,
    options: Options
  ): PreviewData {
    const truncatedThreshold = Math.trunc(indicator.params.threshold * 1000);
    const filter = [
      ...this.getAPMFilters(indicator, options),
      { terms: { 'processor.event': ['metric'] } },
      { term: { 'metricset.name': 'transaction' } },
      { exists: { field: 'transaction.duration.histogram' } },
    ];

    if (this.hasGroupBy(options)) {
      const result = await typedSearch(this.esClient, {
        index: indicator.params.index,
        size: 0,
        query: {
          bool: {
            filter,
          },
        },
        aggs: {
          groupBY: {
            terms: this.groupByAgg(options),
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
          },
        },
      });
      return (
        result.aggregations?.groupBY.buckets.map((groupBucket) => {
          const group = String(groupBucket.key);

          const data =
            groupBucket.perMinute.buckets.map((bucket) => {
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
            }) ?? [];
          return {
            group,
            data,
          };
        }) ?? []
      );
    } else {
      const result = await typedSearch(this.esClient, {
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
  }

  private async getAPMTransactionErrorPreviewData(
    indicator: APMTransactionErrorRateIndicator,
    options: Options
  ): PreviewData {
    const filter = [
      ...this.getAPMFilters(indicator, options),
      { term: { 'metricset.name': 'transaction' } },
      { terms: { 'event.outcome': ['success', 'failure'] } },
    ];

    if (this.hasGroupBy(options)) {
      const result = await typedSearch(this.esClient, {
        index: indicator.params.index,
        size: 0,
        query: {
          bool: {
            filter,
          },
        },
        aggs: {
          groupBY: {
            terms: this.groupByAgg(options),
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
          },
        },
      });
      return (
        result.aggregations?.groupBY.buckets.map((groupBucket) => {
          const group = String(groupBucket.key);

          const data =
            groupBucket?.perMinute.buckets.map((bucket) => ({
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
            })) ?? [];
          return {
            group,
            data,
          };
        }) ?? []
      );
    } else {
      const result = await typedSearch(this.esClient, {
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

      return (
        result.aggregations?.perMinute.buckets.map((bucket) => ({
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
        })) ?? []
      );
    }
  }

  private async getHistogramPreviewData(
    indicator: HistogramIndicator,
    options: Options
  ): PreviewData {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(indicator);
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const timestampField = indicator.params.timestampField;

    const filter = this.getBaseFilters(timestampField, options, filterQuery);

    if (this.hasGroupBy(options)) {
      const result = await typedSearch(this.esClient, {
        index: indicator.params.index,
        size: 0,
        query: {
          bool: {
            filter,
          },
        },
        aggs: {
          groupBY: {
            terms: this.groupByAgg(options),
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
          },
        },
      });

      return (
        result.aggregations?.groupBY.buckets.map((groupBucket) => {
          const data = groupBucket.perMinute.buckets.map((bucket) => {
            // @ts-expect-error
            return this.processBucket(bucket);
          });
          return {
            group: String(groupBucket.key),
            data: data ?? [],
          };
        }) ?? []
      );
    } else {
      const result = await typedSearch(this.esClient, {
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

      return (
        // @ts-expect-error
        result.aggregations?.perMinute.buckets.map((bucket) => this.processBucket(bucket)) ?? []
      );
    }
  }

  private async getCustomMetricPreviewData(
    indicator: MetricCustomIndicator,
    options: Options
  ): PreviewData {
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(indicator);
    const filter = this.getBaseFilters(timestampField, options, filterQuery);

    if (this.hasGroupBy(options)) {
      const result = await typedSearch(this.esClient, {
        index: indicator.params.index,
        size: 0,
        query: {
          bool: {
            filter,
          },
        },
        aggs: {
          groupBY: {
            terms: this.groupByAgg(options),
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
          },
        },
      });

      return (
        result.aggregations?.groupBY.buckets.map((groupBucket) => {
          // @ts-expect-error
          const data = groupBucket.perMinute.buckets.map((bucket) => this.processBucket(bucket));
          return {
            group: String(groupBucket.key),
            data: data ?? [],
          };
        }) ?? []
      );
    } else {
      const result = await typedSearch(this.esClient, {
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

      return (
        // @ts-expect-error
        result.aggregations?.perMinute.buckets.map((bucket) => this.processBucket(bucket)) ?? []
      );
    }
  }

  private async getTimesliceMetricPreviewData(
    indicator: TimesliceMetricIndicator,
    options: Options
  ): PreviewData {
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(
      indicator
    );
    const filter = this.getBaseFilters(timestampField, options, filterQuery);

    if (this.hasGroupBy(options)) {
      const result = await typedSearch(this.esClient, {
        index: indicator.params.index,
        size: 0,
        query: {
          bool: {
            filter,
          },
        },
        aggs: {
          groupBY: {
            terms: this.groupByAgg(options),
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
          },
        },
      });

      return (
        result.aggregations?.groupBY.buckets.map((groupBucket) => {
          const data = groupBucket.perMinute.buckets.map((bucket) => ({
            date: bucket.key_as_string,
            // @ts-expect-error
            sliValue: !!bucket.metric ? bucket.metric.value : null,
          }));
          return {
            group: String(groupBucket.key),
            data: data ?? [],
          };
        }) ?? []
      );
    } else {
      const result = await typedSearch(this.esClient, {
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

      return (
        result.aggregations?.perMinute.buckets.map((bucket) => ({
          date: bucket.key_as_string,
          // @ts-expect-error
          sliValue: !!bucket.metric ? bucket.metric.value : null,
        })) ?? []
      );
    }
  }

  private async getCustomKQLPreviewData(
    indicator: KQLCustomIndicator,
    options: Options
  ): PreviewData {
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const goodQuery = getElasticsearchQueryOrThrow(indicator.params.good);
    const totalQuery = getElasticsearchQueryOrThrow(indicator.params.total);
    const timestampField = indicator.params.timestampField;
    const filter = this.getBaseFilters(timestampField, options, filterQuery);

    if (this.hasGroupBy(options)) {
      const result = await typedSearch(this.esClient, {
        index: indicator.params.index,
        size: 0,
        query: {
          bool: {
            filter,
          },
        },
        aggs: {
          groupBY: {
            terms: this.groupByAgg(options),
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
          },
        },
      });

      return (
        result.aggregations?.groupBY.buckets.map((bucket) => {
          const group = String(bucket.key);
          const data: GetPreviewDataResponse = bucket.perMinute.buckets.map((groupBucket) => {
            return {
              date: groupBucket.key_as_string,
              sliValue:
                !!groupBucket.good && !!groupBucket.total
                  ? computeSLI(groupBucket.good.doc_count, groupBucket.total.doc_count)
                  : null,
              events: {
                good: groupBucket.good?.doc_count ?? 0,
                bad: (groupBucket.total?.doc_count ?? 0) - (groupBucket.good?.doc_count ?? 0),
                total: groupBucket.total?.doc_count ?? 0,
              },
            };
          });
          return { group, data };
        }) ?? []
      );
    } else {
      const result = await typedSearch(this.esClient, {
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

      return (
        result.aggregations?.perMinute.buckets.map((bucket) => {
          return {
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
          };
        }) ?? []
      );
    }
  }

  public async execute(
    params: GetPreviewDataParams
  ): Promise<GetPreviewDataResponse | GetPreviewDataByGroupResponse> {
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
        groupBySampleSize: params.groupBySampleSize,
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
