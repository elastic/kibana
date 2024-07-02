/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import {
  ALL_VALUE,
  APMTransactionErrorRateIndicator,
  GetPreviewSLIParams,
  GetPreviewSLIResponse,
  HistogramIndicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
  SyntheticsAvailabilityIndicator,
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { SYNTHETICS_INDEX_PATTERN } from '../../common/constants';
import { APMTransactionDurationIndicator, DateRange } from '../domain/models';
import { computeSLIForPreview, toDateRange } from '../domain/services';
import { typedSearch } from '../utils/queries';
import {
  GetCustomMetricIndicatorAggregation,
  GetHistogramIndicatorAggregation,
  GetTimesliceMetricIndicatorAggregation,
} from './aggregations';
import { getElasticsearchQueryOrThrow } from './transform_generators';
import { buildParamValues } from './transform_generators/synthetics_availability';

interface Options {
  range: DateRange;
}

export class GetPreviewSLI {
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

  private async getAPMTransactionDurationPreviewSLI(
    indicator: APMTransactionDurationIndicator,
    options: Options
  ): Promise<GetPreviewSLIResponse> {
    const filter: estypes.QueryDslQueryContainer[] = [];

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
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: options.range.from.toISOString(),
                  lte: options.range.to.toISOString(),
                },
              },
            },
            { terms: { 'processor.event': ['metric'] } },
            { term: { 'metricset.name': 'transaction' } },
            { exists: { field: 'transaction.duration.histogram' } },
            ...filter,
          ],
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
    });

    const good = (result.aggregations?.good?.value as number) ?? 0;
    const total = result.aggregations?.total?.value ?? 0;
    return { sliValue: computeSLIForPreview(good, total) };
  }

  private async getAPMTransactionErrorPreviewSLI(
    indicator: APMTransactionErrorRateIndicator,
    options: Options
  ): Promise<GetPreviewSLIResponse> {
    const filter: estypes.QueryDslQueryContainer[] = [];

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
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: options.range.from.toISOString(),
                  lte: options.range.to.toISOString(),
                },
              },
            },
            { term: { 'metricset.name': 'transaction' } },
            { terms: { 'event.outcome': ['success', 'failure'] } },
            ...filter,
          ],
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
    });

    // @ts-ignore types are wrong
    const good = result.aggregations?.good?.doc_count ?? 0;
    // @ts-ignore types are wrong
    const total = result.aggregations?.total?.doc_count ?? 0;
    return { sliValue: computeSLIForPreview(good, total) };
  }

  private async getHistogramPreviewSLI(
    indicator: HistogramIndicator,
    options: Options
  ): Promise<GetPreviewSLIResponse> {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(indicator);
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const timestampField = indicator.params.timestampField;

    const filter: estypes.QueryDslQueryContainer[] = [
      {
        range: {
          [timestampField]: {
            gte: options.range.from.toISOString(),
            lte: options.range.to.toISOString(),
          },
        },
      },
      filterQuery,
    ];

    const result = await this.esClient.search({
      index: indicator.params.index,
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
        ...getHistogramIndicatorAggregations.execute({
          type: 'good',
          aggregationKey: 'good',
        }),
        ...getHistogramIndicatorAggregations.execute({
          type: 'total',
          aggregationKey: 'total',
        }),
      },
    });

    // @ts-ignore types are wrong
    const good = result.aggregations?.good?.value ?? 0;
    // @ts-ignore types are wrong
    const total = result.aggregations?.total?.value ?? 0;
    return {
      sliValue: computeSLIForPreview(good, total),
    };
  }

  private async getCustomMetricPreviewSLI(
    indicator: MetricCustomIndicator,
    options: Options
  ): Promise<GetPreviewSLIResponse> {
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(indicator);

    const filter: estypes.QueryDslQueryContainer[] = [
      {
        range: {
          [timestampField]: {
            gte: options.range.from.toISOString(),
            lte: options.range.to.toISOString(),
          },
        },
      },
      filterQuery,
    ];

    const result = await this.esClient.search({
      index: indicator.params.index,
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
        ...getCustomMetricIndicatorAggregation.execute({
          type: 'good',
          aggregationKey: 'good',
        }),
        ...getCustomMetricIndicatorAggregation.execute({
          type: 'total',
          aggregationKey: 'total',
        }),
      },
    });

    // @ts-ignore types are wrong
    const good = result.aggregations?.good?.value ?? 0;
    // @ts-ignore types are wrong
    const total = result.aggregations?.total?.value ?? 0;
    return { sliValue: computeSLIForPreview(good, total) };
  }

  private async getTimesliceMetricPreviewSLI(
    indicator: TimesliceMetricIndicator,
    options: Options
  ): Promise<GetPreviewSLIResponse> {
    const timestampField = indicator.params.timestampField;
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const getCustomMetricIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(
      indicator
    );

    const filter: estypes.QueryDslQueryContainer[] = [
      {
        range: {
          [timestampField]: {
            gte: options.range.from.toISOString(),
            lte: options.range.to.toISOString(),
          },
        },
      },
      filterQuery,
    ];

    const result = await this.esClient.search({
      index: indicator.params.index,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: getCustomMetricIndicatorAggregation.execute('metric'),
    });

    // @ts-ignore types are wrong
    return { sliValue: result.aggregations?.metric?.value ?? null };
  }

  private async getCustomKQLPreviewSLI(
    indicator: KQLCustomIndicator,
    options: Options
  ): Promise<GetPreviewSLIResponse> {
    const filterQuery = getElasticsearchQueryOrThrow(indicator.params.filter);
    const goodQuery = getElasticsearchQueryOrThrow(indicator.params.good);
    const totalQuery = getElasticsearchQueryOrThrow(indicator.params.total);
    const timestampField = indicator.params.timestampField;
    const filter: estypes.QueryDslQueryContainer[] = [
      {
        range: {
          [timestampField]: {
            gte: options.range.from.toISOString(),
            lte: options.range.to.toISOString(),
          },
        },
      },
      filterQuery,
    ];

    const result = await this.esClient.search({
      index: indicator.params.index,
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
        good: { filter: goodQuery },
        total: { filter: totalQuery },
      },
    });

    // @ts-ignore types are wrong
    const good = result.aggregations?.good?.doc_count ?? 0;
    // @ts-ignore types are wrong
    const total = result.aggregations?.total?.doc_count ?? 0;
    return { sliValue: computeSLIForPreview(good, total) };
  }

  private async getSyntheticsAvailabilityPreviewSLI(
    indicator: SyntheticsAvailabilityIndicator,
    options: Options
  ): Promise<GetPreviewSLIResponse> {
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

    const result = await this.esClient.search({
      index: SYNTHETICS_INDEX_PATTERN,
      runtime_mappings: await this.buildRuntimeMappings({
        dataViewId: indicator.params.dataViewId,
      }),
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: options.range.from.toISOString(),
                  lte: options.range.to.toISOString(),
                },
              },
            },
            { term: { 'summary.final_attempt': true } },
            { term: { 'meta.space_id': this.spaceId } },
            ...filter,
          ],
        },
      },
      aggs: {
        good: {
          filter: {
            term: {
              'monitor.status': 'up',
            },
          },
        },
        total: {
          filter: {
            match_all: {},
          },
        },
      },
    });

    // @ts-ignore types are wrong
    const good = result.aggregations?.good?.doc_count ?? 0;
    // @ts-ignore types are wrong
    const total = result.aggregations?.total?.doc_count ?? 0;
    return { sliValue: computeSLIForPreview(good, total) };
  }

  public async execute(params: GetPreviewSLIParams): Promise<GetPreviewSLIResponse> {
    try {
      const options: Options = {
        range: toDateRange(params.timeWindow),
      };

      const type = params.indicator.type;
      switch (type) {
        case 'sli.apm.transactionDuration':
          return this.getAPMTransactionDurationPreviewSLI(params.indicator, options);
        case 'sli.apm.transactionErrorRate':
          return this.getAPMTransactionErrorPreviewSLI(params.indicator, options);
        case 'sli.synthetics.availability':
          return this.getSyntheticsAvailabilityPreviewSLI(params.indicator, options);
        case 'sli.kql.custom':
          return this.getCustomKQLPreviewSLI(params.indicator, options);
        case 'sli.histogram.custom':
          return this.getHistogramPreviewSLI(params.indicator, options);
        case 'sli.metric.custom':
          return this.getCustomMetricPreviewSLI(params.indicator, options);
        case 'sli.metric.timeslice':
          return this.getTimesliceMetricPreviewSLI(params.indicator, options);
        default:
          assertNever(type);
      }
    } catch (err) {
      return { sliValue: null };
    }
  }
}
