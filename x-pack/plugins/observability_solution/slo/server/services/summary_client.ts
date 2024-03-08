/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  calendarAlignedTimeWindowSchema,
  Duration,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
  toMomentUnitOfTime,
} from '@kbn/slo-schema';
import moment from 'moment';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { DateRange, SLO, Summary, Groupings, Meta } from '../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../domain/services';
import { toDateRange } from '../domain/services/date_range';
import { getFlattenedGroupings } from './utils';

export interface SummaryClient {
  computeSummary(
    slo: SLO,
    groupings?: string,
    instanceId?: string
  ): Promise<{ summary: Summary; groupings: Groupings; meta: Meta }>;
}

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async computeSummary(
    slo: SLO,
    instanceId: string = ALL_VALUE
  ): Promise<{ summary: Summary; groupings: Groupings; meta: Meta }> {
    const dateRange = toDateRange(slo.timeWindow);
    const isDefinedWithGroupBy = ![slo.groupBy].flat().includes(ALL_VALUE);
    const hasInstanceId = instanceId !== ALL_VALUE;
    const includeInstanceIdQueries = isDefinedWithGroupBy && hasInstanceId;
    const extraInstanceIdFilter = includeInstanceIdQueries
      ? [{ term: { 'slo.instanceId': instanceId } }]
      : [];
    const extraGroupingsAgg = {
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
    };

    const result = await this.esClient.search({
      index: SLO_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { 'slo.id': slo.id } },
            { term: { 'slo.revision': slo.revision } },
            {
              range: {
                '@timestamp': { gte: dateRange.from.toISOString(), lt: dateRange.to.toISOString() },
              },
            },
            ...extraInstanceIdFilter,
          ],
        },
      },
      // @ts-expect-error AggregationsAggregationContainer needs to be updated with top_hits
      aggs: {
        ...(includeInstanceIdQueries && extraGroupingsAgg),
        ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good: {
            sum: { field: 'slo.isGoodSlice' },
          },
          total: {
            value_count: { field: 'slo.isGoodSlice' },
          },
        }),
        ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good: { sum: { field: 'slo.numerator' } },
          total: { sum: { field: 'slo.denominator' } },
        }),
      },
    });

    // @ts-ignore value is not type correctly
    const good = result.aggregations?.good?.value ?? 0;
    // @ts-ignore value is not type correctly
    const total = result.aggregations?.total?.value ?? 0;
    // @ts-expect-error AggregationsAggregationContainer needs to be updated with top_hits
    const source = result.aggregations?.last_doc?.hits?.hits?.[0]?._source;
    const groupings = source?.slo?.groupings;

    const sliValue = computeSLI(good, total);
    const initialErrorBudget = 1 - slo.objective.target;
    let errorBudget;

    if (
      calendarAlignedTimeWindowSchema.is(slo.timeWindow) &&
      timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ) {
      const totalSlices = computeTotalSlicesFromDateRange(
        dateRange,
        slo.objective.timesliceWindow!
      );
      const consumedErrorBudget =
        sliValue < 0 ? 0 : (total - good) / (totalSlices * initialErrorBudget);

      errorBudget = toErrorBudget(initialErrorBudget, consumedErrorBudget);
    } else {
      const consumedErrorBudget = sliValue < 0 ? 0 : (1 - sliValue) / initialErrorBudget;
      errorBudget = toErrorBudget(
        initialErrorBudget,
        consumedErrorBudget,
        calendarAlignedTimeWindowSchema.is(slo.timeWindow)
      );
    }

    return {
      summary: {
        sliValue,
        errorBudget,
        status: computeSummaryStatus(slo, sliValue, errorBudget),
      },
      groupings: groupings ? getFlattenedGroupings({ groupBy: slo.groupBy, groupings }) : {},
      meta: getMetaFields(slo, source || {}),
    };
  }
}

function computeTotalSlicesFromDateRange(dateRange: DateRange, timesliceWindow: Duration) {
  const dateRangeDurationInUnit = moment(dateRange.to).diff(
    dateRange.from,
    toMomentUnitOfTime(timesliceWindow.unit)
  );
  return Math.ceil(dateRangeDurationInUnit / timesliceWindow!.value);
}

export function getMetaFields(
  slo: SLO,
  source: { monitor?: { id?: string }; config_id?: string; observer?: { name?: string } }
): Meta {
  const {
    indicator: { type },
  } = slo;
  switch (type) {
    case 'sli.synthetics.availability':
      return {
        synthetics: {
          monitorId: source.monitor?.id || '',
          locationId: source.observer?.name || '',
          configId: source.config_id || '',
        },
      };
    default:
      return {};
  }
}
