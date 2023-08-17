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
import { SLO_DESTINATION_INDEX_PATTERN } from '../../assets/constants';
import { DateRange, SLO, Summary } from '../../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../../domain/services';
import { toDateRange } from '../../domain/services/date_range';

export interface SummaryClient {
  computeSummary(slo: SLO, instanceId?: string): Promise<Summary>;
}

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient) {}

  async computeSummary(slo: SLO, instanceId: string = ALL_VALUE): Promise<Summary> {
    const dateRange = toDateRange(slo.timeWindow);
    const isDefinedWithGroupBy = slo.groupBy !== ALL_VALUE;
    const hasInstanceId = instanceId !== ALL_VALUE;
    const extraInstanceIdFilter =
      isDefinedWithGroupBy && hasInstanceId ? [{ term: { 'slo.instanceId': instanceId } }] : [];

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
      ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        aggs: {
          good: { sum: { field: 'slo.numerator' } },
          total: { sum: { field: 'slo.denominator' } },
        },
      }),
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        aggs: {
          good: {
            sum: { field: 'slo.isGoodSlice' },
          },
          total: {
            value_count: { field: 'slo.isGoodSlice' },
          },
        },
      }),
    });

    // @ts-ignore value is not type correctly
    const good = result.aggregations?.good?.value ?? 0;
    // @ts-ignore value is not type correctly
    const total = result.aggregations?.total?.value ?? 0;

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
      sliValue,
      errorBudget,
      status: computeSummaryStatus(slo, sliValue, errorBudget),
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
