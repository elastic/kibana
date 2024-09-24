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
  SyntheticsAvailabilityIndicator,
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
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import { getElasticsearchQueryOrThrow } from './transform_generators';

import { buildParamValues } from './transform_generators/synthetics_availability';
import { typedSearch } from '../utils/queries';
import { APMTransactionDurationIndicator } from '../domain/models';
import { computeSLIForPreview } from '../domain/services';
import {
  GetCustomMetricIndicatorAggregation,
  GetHistogramIndicatorAggregation,
  GetTimesliceMetricIndicatorAggregation,
} from './aggregations';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';

interface Options {
  range: {
    start: number;
    end: number;
  };
  interval: string;
  instanceId?: string;
  remoteName?: string;
  groupBy?: string | string[];
  groupings?: Record<string, unknown>;
}
export class GetPreviewData {
  constructor(
    private esClient: ElasticsearchClient,
    private spaceId: string,
    private dataViewService: DataViewsService
  ) {}

  public async buildRuntimeMappings({ dataViewId }: { dataViewId?: string }) {
    let dataView: DataView | undefined;
    if (dataViewId) {
      try {
        dataView = await this.dataViewService.get(dataViewId);
      } catch (e) {
        // If the data view is not found, we will continue without it
      }
    }
    return dataView?.getRuntimeMappings?.() ?? {};
  }

  private async getAPMTransactionDurationPreviewData(
    indicator: APMTransactionDurationIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const filter: estypes.QueryDslQueryContainer[] = [];
    this.getGroupingsFilter(options, filter);
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

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const result = await typedSearch(this.esClient, {
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
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
          sliValue: computeSLIForPreview(good, total),
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
    this.getGroupingsFilter(options, filter);
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

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const result = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
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
          ? computeSLIForPreview(bucket.good.doc_count, bucket.total.doc_count)
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

    this.getGroupingsFilter(options, filter);

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const result = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
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
        !!bucket.good && !!bucket.total
          ? computeSLIForPreview(bucket.good.value, bucket.total.value)
          : null,
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
    this.getGroupingsFilter(options, filter);

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const result = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
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
        !!bucket.good && !!bucket.total
          ? computeSLIForPreview(bucket.good.value, bucket.total.value)
          : null,
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

    this.getGroupingsFilter(options, filter);

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const result = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
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

    this.getGroupingsFilter(options, filter);

    const index = options.remoteName
      ? `${options.remoteName}:${indicator.params.index}`
      : indicator.params.index;

    const result = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
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
          ? computeSLIForPreview(bucket.good.doc_count, bucket.total.doc_count)
          : null,
      events: {
        good: bucket.good?.doc_count ?? 0,
        bad: (bucket.total?.doc_count ?? 0) - (bucket.good?.doc_count ?? 0),
        total: bucket.total?.doc_count ?? 0,
      },
    }));
  }

  private getGroupingsFilter(options: Options, filter: estypes.QueryDslQueryContainer[]) {
    const groupingsKeys = Object.keys(options.groupings || []);

    if (groupingsKeys.length) {
      groupingsKeys.forEach((key) => {
        filter.push({
          term: { [key]: options.groupings?.[key] },
        });
      });
    } else if (options.instanceId && options.instanceId !== ALL_VALUE && options.groupBy) {
      const instanceIdPart = options.instanceId.split(',');
      const groupByPart = Array.isArray(options.groupBy) ? options.groupBy : [options.groupBy];
      groupByPart.forEach((groupBy, index) => {
        filter.push({
          term: { [groupBy]: instanceIdPart[index] },
        });
      });
    }
  }

  private async getSyntheticsAvailabilityPreviewData(
    indicator: SyntheticsAvailabilityIndicator,
    options: Options
  ): Promise<GetPreviewDataResponse> {
    const filter = [];
    const { monitorIds, tags, projects } = buildParamValues({
      monitorIds: indicator.params.monitorIds || [],
      tags: indicator.params.tags || [],
      projects: indicator.params.projects || [],
    });
    if (!monitorIds.includes(ALL_VALUE) && monitorIds.length > 0)
      filter.push({
        terms: { 'monitor.id': monitorIds },
      });
    if (!tags.includes(ALL_VALUE) && tags.length > 0)
      filter.push({
        terms: { tags },
      });
    if (!projects.includes(ALL_VALUE) && projects.length > 0)
      filter.push({
        terms: { 'monitor.project.id': projects },
      });

    const index = options.remoteName
      ? `${options.remoteName}:${SYNTHETICS_INDEX_PATTERN}`
      : SYNTHETICS_INDEX_PATTERN;

    const result = await this.esClient.search({
      index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: options.range.start, lte: options.range.end } } },
            { term: { 'summary.final_attempt': true } },
            { term: { 'meta.space_id': this.spaceId } },
            ...filter,
          ],
        },
      },
      aggs: {
        perMinute: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '10m',
          },
          aggs: {
            good: {
              filter: {
                term: {
                  'monitor.status': 'up',
                },
              },
            },
            bad: {
              filter: {
                term: {
                  'monitor.status': 'down',
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

    const data: GetPreviewDataResponse = [];

    // @ts-ignore buckets is not improperly typed
    result.aggregations?.perMinute.buckets.forEach((bucket) => {
      const good = bucket.good?.doc_count ?? 0;
      const bad = bucket.bad?.doc_count ?? 0;
      const total = bucket.total?.doc_count ?? 0;
      data.push({
        date: bucket.key_as_string,
        sliValue: computeSLIForPreview(good, total),
        events: {
          good,
          bad,
          total,
        },
      });
    });

    return data;
  }

  public async execute(params: GetPreviewDataParams): Promise<GetPreviewDataResponse> {
    try {
      // If the time range is 24h or less, then we want to use a 1m bucket for the
      // Timeslice metric so that the chart is as close to the evaluation as possible.
      // Otherwise due to how the statistics work, the values might not look like
      // they've breached the threshold.
      const rangeDuration = moment(params.range.to).diff(params.range.from, 'ms');
      const bucketSize =
        params.indicator.type === 'sli.metric.timeslice' &&
        rangeDuration <= 86_400_000 &&
        params.objective?.timesliceWindow
          ? params.objective.timesliceWindow.asMinutes()
          : Math.max(
              calculateAuto.near(100, moment.duration(rangeDuration, 'ms'))?.asMinutes() ?? 0,
              1
            );
      const options: Options = {
        instanceId: params.instanceId,
        range: { start: params.range.from.getTime(), end: params.range.to.getTime() },
        groupBy: params.groupBy,
        remoteName: params.remoteName,
        groupings: params.groupings,
        interval: `${bucketSize}m`,
      };

      const type = params.indicator.type;
      switch (type) {
        case 'sli.apm.transactionDuration':
          return this.getAPMTransactionDurationPreviewData(params.indicator, options);
        case 'sli.apm.transactionErrorRate':
          return this.getAPMTransactionErrorPreviewData(params.indicator, options);
        case 'sli.synthetics.availability':
          return this.getSyntheticsAvailabilityPreviewData(params.indicator, options);
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
