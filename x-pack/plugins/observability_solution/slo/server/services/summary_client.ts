/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsValueCountAggregate } from '@elastic/elasticsearch/lib/api/types';
import {
  AggregationsSumAggregate,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  calendarAlignedTimeWindowSchema,
  Duration,
  DurationUnit,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { DateRange, Groupings, Meta, SLODefinition, Summary } from '../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../domain/services';
import { toDateRange } from '../domain/services/date_range';
import { getFlattenedGroupings } from './utils';
import { computeTotalSlicesFromDateRange } from './utils/compute_total_slices_from_date_range';

interface Params {
  slo: SLODefinition;
  instanceId?: string;
  remoteName?: string;
}

interface SummaryResult {
  summary: Summary;
  groupings: Groupings;
  meta: Meta;
}

// This is called "SummaryClient" but is responsible for:
// - computing summary
// - formatting groupings
// - adding extra Meta parameter for synthetics
export interface SummaryClient {
  computeSummary(params: Params): Promise<SummaryResult>;
}

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async computeSummary({ slo, instanceId, remoteName }: Params): Promise<SummaryResult> {
    const dateRange = toDateRange(slo.timeWindow);
    const isDefinedWithGroupBy = ![slo.groupBy].flat().includes(ALL_VALUE);
    const hasInstanceId = instanceId !== ALL_VALUE;
    const shouldIncludeInstanceIdFilter = isDefinedWithGroupBy && hasInstanceId;

    const instanceIdFilter = shouldIncludeInstanceIdFilter
      ? [{ term: { 'slo.instanceId': instanceId } }]
      : [];

    const result = await this.esClient.search<
      any,
      {
        good: AggregationsSumAggregate;
        total: AggregationsSumAggregate;
        last_doc: AggregationsTopHitsAggregate;
        last5m: {
          good: AggregationsSumAggregate;
          total: AggregationsSumAggregate | AggregationsValueCountAggregate;
        };
        last1h: {
          good: AggregationsSumAggregate;
          total: AggregationsSumAggregate | AggregationsValueCountAggregate;
        };
        last1d: {
          good: AggregationsSumAggregate;
          total: AggregationsSumAggregate | AggregationsValueCountAggregate;
        };
      }
    >({
      index: remoteName
        ? `${remoteName}:${SLO_DESTINATION_INDEX_PATTERN}`
        : SLO_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { 'slo.id': slo.id } },
            { term: { 'slo.revision': slo.revision } },
            {
              range: {
                '@timestamp': {
                  gte: dateRange.from.toISOString(),
                  lte: dateRange.to.toISOString(),
                },
              },
            },
            ...instanceIdFilter,
          ],
        },
      },
      aggs: {
        ...(shouldIncludeInstanceIdFilter && {
          last_doc: {
            top_hits: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: ['slo.groupings', 'monitor', 'observer', 'config_id'],
              },
              size: 1,
            },
          },
        }),
        ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good: { sum: { field: 'slo.isGoodSlice' } },
          total: { value_count: { field: 'slo.isGoodSlice' } },
          last5m: {
            filter: {
              range: {
                '@timestamp': {
                  gte: 'now-5m/m',
                  lte: 'now/m',
                },
              },
            },
            aggs: {
              good: { sum: { field: 'slo.isGoodSlice' } },
              total: { value_count: { field: 'slo.isGoodSlice' } },
            },
          },
          last1h: {
            filter: {
              range: {
                '@timestamp': {
                  gte: 'now-1h/m',
                  lte: 'now/m',
                },
              },
            },
            aggs: {
              good: { sum: { field: 'slo.isGoodSlice' } },
              total: { value_count: { field: 'slo.isGoodSlice' } },
            },
          },
          last1d: {
            filter: {
              range: {
                '@timestamp': {
                  gte: 'now-1d/m',
                  lte: 'now/m',
                },
              },
            },
            aggs: {
              good: { sum: { field: 'slo.isGoodSlice' } },
              total: { value_count: { field: 'slo.isGoodSlice' } },
            },
          },
        }),
        ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good: { sum: { field: 'slo.numerator' } },
          total: { sum: { field: 'slo.denominator' } },
          last5m: {
            filter: {
              range: {
                '@timestamp': {
                  gte: 'now-5m/m',
                  lte: 'now/m',
                },
              },
            },
            aggs: {
              good: { sum: { field: 'slo.numerator' } },
              total: { sum: { field: 'slo.denominator' } },
            },
          },
          last1h: {
            filter: {
              range: {
                '@timestamp': {
                  gte: 'now-1h/m',
                  lte: 'now/m',
                },
              },
            },
            aggs: {
              good: { sum: { field: 'slo.numerator' } },
              total: { sum: { field: 'slo.denominator' } },
            },
          },
          last1d: {
            filter: {
              range: {
                '@timestamp': {
                  gte: 'now-1d/m',
                  lte: 'now/m',
                },
              },
            },
            aggs: {
              good: { sum: { field: 'slo.numerator' } },
              total: { sum: { field: 'slo.denominator' } },
            },
          },
        }),
      },
    });

    const source = result.aggregations?.last_doc?.hits?.hits?.[0]?._source;
    const groupings = source?.slo?.groupings;

    const sliValue = computeSliValue(slo, dateRange, result.aggregations);
    const errorBudget = computeErrorBudget(slo, sliValue);

    return {
      summary: {
        sliValue,
        errorBudget,
        status: computeSummaryStatus(slo.objective, sliValue, errorBudget),
        fiveMinuteBurnRate: computeBurnRate(
          slo,
          new Duration(5, DurationUnit.Minute),
          result.aggregations?.last5m
        ),
        oneHourBurnRate: computeBurnRate(
          slo,
          new Duration(1, DurationUnit.Hour),
          result.aggregations?.last1h
        ),
        oneDayBurnRate: computeBurnRate(
          slo,
          new Duration(1, DurationUnit.Day),
          result.aggregations?.last1d
        ),
      },
      groupings: groupings ? getFlattenedGroupings({ groupBy: slo.groupBy, groupings }) : {},
      meta: getMetaFields(slo, source ?? {}),
    };
  }
}

function getMetaFields(
  slo: SLODefinition,
  source: { monitor?: { id?: string }; config_id?: string; observer?: { name?: string } }
): Meta {
  const {
    indicator: { type },
  } = slo;
  switch (type) {
    case 'sli.synthetics.availability':
      return {
        synthetics: {
          monitorId: source.monitor?.id ?? '',
          locationId: source.observer?.name ?? '',
          configId: source.config_id ?? '',
        },
      };
    default:
      return {};
  }
}

interface BurnRateBucket {
  good: AggregationsSumAggregate;
  total: AggregationsSumAggregate | AggregationsValueCountAggregate;
}

function computeSliValue(
  slo: SLODefinition,
  dateRange: DateRange,
  bucket: BurnRateBucket | undefined
) {
  const good = bucket?.good?.value ?? 0;
  const total = bucket?.total?.value ?? 0;

  if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
    const totalSlices = computeTotalSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!);

    return computeSLI(good, total, totalSlices);
  }

  return computeSLI(good, total);
}

function computeErrorBudget(slo: SLODefinition, sliValue: number) {
  const initialErrorBudget = 1 - slo.objective.target;
  const consumedErrorBudget = sliValue < 0 ? 0 : (1 - sliValue) / initialErrorBudget;

  return toErrorBudget(
    initialErrorBudget,
    consumedErrorBudget,
    calendarAlignedTimeWindowSchema.is(slo.timeWindow) &&
      occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)
  );
}

function computeBurnRate(
  slo: SLODefinition,
  duration: Duration,
  bucket: BurnRateBucket | undefined
) {
  const good = bucket?.good?.value ?? 0;
  const total = bucket?.total?.value ?? 0;
  if (total === 0) {
    return 0;
  }

  if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
    const totalSlicesInBucket = Math.floor(
      duration.asMinutes() / slo.objective.timesliceWindow!.asMinutes()
    );
    if (totalSlicesInBucket === 0) {
      return 0;
    }

    const badEvents = total - good;
    const sliValue = 1 - badEvents / totalSlicesInBucket;
    return (1 - sliValue) / (1 - slo.objective.target);
  }

  const sliValue = good / total;
  return (1 - sliValue) / (1 - slo.objective.target);
}
