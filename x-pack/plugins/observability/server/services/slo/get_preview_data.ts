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
  SyntheticsAvailabilityIndicator,
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { APMTransactionDurationIndicator } from '../../domain/models';
import { buildParamValues } from './transform_generators/synthetics_availability';
import { computeSLI } from '../../domain/services';
import { InvalidQueryError } from '../../errors';
import {
  GetCustomMetricIndicatorAggregation,
  GetHistogramIndicatorAggregation,
  GetTimesliceMetricIndicatorAggregation,
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
      size: 0,
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
      size: 0,
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

  private async getSyntheticsAvailabilityPreviewData(
    indicator: SyntheticsAvailabilityIndicator
  ): Promise<GetPreviewDataResponse> {
    const filter = [];
    const { monitorIds, tags, projects } = buildParamValues(indicator.params);
    if (!monitorIds.includes(ALL_VALUE))
      filter.push({
        terms: { 'monitor.id': monitorIds },
      });
    if (!tags.includes(ALL_VALUE))
      filter.push({
        terms: { tags },
      });
    if (!projects.includes(ALL_VALUE))
      filter.push({
        terms: { 'monitor.project.id': projects },
      });

    const result = await this.esClient.search({
      index: 'synthetics-*',
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: 'now-24h' } } },
            { exists: { field: 'summary.final_attempt' } },
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
                range: {
                  'summary.up': {
                    gte: 1,
                  },
                },
              },
            },
            bad: {
              filter: {
                range: {
                  'summary.up': {
                    lte: 0,
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

    const data: GetPreviewDataResponse = [];

    // @ts-ignore buckets is not improperly typed
    result.aggregations?.perMinute.buckets.forEach((bucket) => {
      data.push({
        date: bucket.key_as_string,
        sliValue: !!bucket.good ? bucket.good.doc_count : 0,
        label: 'good events',
      });
      data.push({
        date: bucket.key_as_string,
        sliValue: !!bucket.bad ? bucket.bad.doc_count : 0,
        label: 'bad events',
      });
    });

    return data;
  }

  private async getHistogramPreviewData(
    indicator: HistogramIndicator
  ): Promise<GetPreviewDataResponse> {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(indicator);
    const filterQuery = getElastichsearchQueryOrThrow(indicator.params.filter);
    const timestampField = indicator.params.timestampField;
    const options = {
      index: indicator.params.index,
      size: 0,
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
      size: 0,
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

  private async getTimesliceMetricPreviewData(
    indicator: TimesliceMetricIndicator
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
    indicator: KQLCustomIndicator
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
    try {
      const type = params.indicator.type;
      switch (type) {
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
        case 'sli.metric.timeslice':
          return this.getTimesliceMetricPreviewData(params.indicator);
        case 'sli.synthetics.availability':
          return this.getSyntheticsAvailabilityPreviewData(params.indicator);
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
