/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  calendarAlignedTimeWindowSchema,
  DurationUnit,
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';

import {
  SLO_DESTINATION_INDEX_NAME,
  getSLOSummaryTransformId,
  SLO_SUMMARY_INDEX_NAME,
} from '../../../assets/constants';
import { SLO } from '../../../domain/models';

export interface SummaryTransformGenerator {
  generate(slo: SLO): TransformPutTransformRequest;
}

export class DefaultSummaryTransformGenerator implements SummaryTransformGenerator {
  generate(slo: SLO): TransformPutTransformRequest {
    let aggregations = {};
    if (rollingTimeWindowSchema.is(slo.timeWindow)) {
      aggregations = generateAggregationsForRolling(slo);
    } else if (calendarAlignedTimeWindowSchema.is(slo.timeWindow)) {
      if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
        aggregations = generateAggregationsForCalendarAndTimeslices(slo);
      } else if (occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)) {
        aggregations = generateAggregationsForCalendarAndOccurrences(slo);
      } else {
        assertNever(slo.budgetingMethod);
      }
    } else {
      assertNever(slo.timeWindow);
    }

    return {
      transform_id: getSLOSummaryTransformId(slo.id, slo.revision),
      description: `Summary data for SLO: ${slo.name}`,
      source: {
        index: `${SLO_DESTINATION_INDEX_NAME}*`,
        runtime_mappings: {
          objective: {
            type: 'double',
            script: {
              source: `emit(${slo.objective.target})`,
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                term: { 'slo.id': slo.id },
              },
              {
                term: { 'slo.revision': slo.revision },
              },
              {
                range: {
                  ...(rollingTimeWindowSchema.is(slo.timeWindow) && {
                    '@timestamp': {
                      gte: `now-${slo.timeWindow.duration.format()}/m`,
                      lte: 'now/m',
                    },
                  }),
                  ...(calendarAlignedTimeWindowSchema.is(slo.timeWindow) && {
                    '@timestamp': {
                      gte: `now/${slo.timeWindow.duration.unit}`, // "now/w" or "now/M"
                      lte: `now/m`,
                    },
                  }),
                },
              },
            ],
          },
        },
      },
      pivot: {
        group_by: {
          'slo.id': {
            terms: {
              field: 'slo.id',
            },
          },
          'slo.revision': {
            terms: {
              field: 'slo.revision',
            },
          },
        },
        aggregations,
      },
      dest: { index: SLO_SUMMARY_INDEX_NAME },
      frequency: '1m',
      sync: {
        time: {
          field: '@timestamp',
          delay: '60s',
        },
      },
      settings: {
        deduce_mappings: false,
      },
      _meta: {
        version: 1,
        managed: true,
        managed_by: 'observability',
      },
    };
  }
}

function generateAggregationsForRolling(slo: SLO) {
  return {
    period: {
      range: {
        field: '@timestamp',
        keyed: true,
        ranges: [
          {
            key: 'last',
          },
        ],
      },
      aggs: {
        ...(occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good_events: {
            sum: {
              field: 'slo.numerator',
            },
          },
          total_events: {
            sum: {
              field: 'slo.denominator',
            },
          },
        }),
        ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
          good_events: {
            sum: {
              field: 'slo.isGoodSlice',
            },
          },
          total_events: {
            value_count: {
              field: 'slo.isGoodSlice',
            },
          },
        }),
        objective: {
          max: {
            field: 'objective',
          },
        },
        sli_value: {
          bucket_script: {
            buckets_path: {
              goodEvents: 'good_events',
              totalEvents: 'total_events',
            },
            script:
              'if (params.totalEvents == 0) { return -1 } else { return params.goodEvents / params.totalEvents }',
          },
        },
        error_budget_initial: {
          bucket_script: {
            buckets_path: {
              objective: 'objective',
            },
            script: '1 - params.objective',
          },
        },
        error_budget_consumed: {
          bucket_script: {
            buckets_path: {
              sliValue: 'sli_value',
              errorBudgetInitial: 'error_budget_initial',
            },
            script:
              'if (params.sliValue == -1) { return 0 } else { return (1 - params.sliValue) / params.errorBudgetInitial }',
          },
        },
        error_budget_remaining: {
          bucket_script: {
            buckets_path: {
              errorBudgetConsummed: 'error_budget_consumed',
            },
            script: '1 - params.errorBudgetConsummed',
          },
        },
        status: {
          bucket_script: {
            buckets_path: {
              sliValue: 'sli_value',
              objective: 'objective',
              errorBudgetRemaining: 'error_budget_remaining',
            },
            script:
              'if (params.sliValue == -1) { return 0 } else if (params.sliValue >= params.objective) { return 4 } else if (params.errorBudgetRemaining > 0) { return 2 } else { return 1 }',
          },
        },
      },
    },
  };
}

function generateAggregationsForCalendarAndTimeslices(slo: SLO) {
  return {
    period: {
      range: {
        field: '@timestamp',
        keyed: true,
        ranges: [
          {
            key: 'last',
          },
        ],
      },
      aggs: {
        total_slices_in_period: {
          bucket_script: {
            buckets_path: {},
            script: {
              params: {
                calendar: slo.timeWindow.duration.unit === DurationUnit.Week ? 'week' : 'month',
                slice_unit: slo.objective.timesliceWindow!.unit,
                slice_duration: slo.objective.timesliceWindow!.value,
              },
              source: `
                if (params.calendar == "month") {
                  Date d = new Date(); 
                  Instant instant = Instant.ofEpochMilli(d.getTime());
                  LocalDateTime now = LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
                  LocalDateTime startOfMonth = now
                    .withDayOfMonth(1)
                    .withHour(0)
                    .withMinute(0)
                    .withSecond(0);
                  LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);
                  
                  long slices = 1;
                  if (params.slice_unit == "h") {
                    slices = Duration.between(startOfMonth, startOfNextMonth).toHours() / params.slice_duration
                  } else if (params.slice_unit == "m") {
                    slices = Duration.between(startOfMonth, startOfNextMonth).toMinutes() / params.slice_duration
                  }
                  
                  return Math.ceil(slices);
                } else if (params.calendar == "week") {
                  int slices = 1;
                  if (params.slice_unit == "h") {
                    slices = 7 * 24 / params.slice_duration
                  } else if (params.slice_unit == "m") {
                    slices = 7 * 24 * 60 / params.slice_duration
                  }
                  
                  return Math.ceil(slices);
                }
              `,
            },
          },
        },
        good_events: {
          sum: {
            field: 'slo.isGoodSlice',
          },
        },
        total_events: {
          value_count: {
            field: 'slo.isGoodSlice',
          },
        },
        objective: {
          max: {
            field: 'objective',
          },
        },
        sli_value: {
          bucket_script: {
            buckets_path: {
              goodEvents: 'good_events',
              totalEvents: 'total_events',
            },
            script:
              'if (params.totalEvents == 0) { return -1 } else { return params.goodEvents / params.totalEvents }',
          },
        },
        error_budget_initial: {
          bucket_script: {
            buckets_path: {
              objective: 'objective',
            },
            script: '1 - params.objective',
          },
        },
        error_budget_consumed: {
          bucket_script: {
            buckets_path: {
              goodEvents: 'good_events',
              totalEvents: 'total_events',
              totalSlicesInPeriod: 'total_slices_in_period',
              errorBudgetInitial: 'error_budget_initial',
            },
            script:
              'if (params.totalEvents == 0) { return 0 } else { return (params.totalEvents - params.goodEvents) / (params.totalSlicesInPeriod * params.errorBudgetInitial) }',
          },
        },
        error_budget_remaining: {
          bucket_script: {
            buckets_path: {
              errorBudgetConsumed: 'error_budget_consumed',
            },
            script: '1 - params.errorBudgetConsumed',
          },
        },
        status: {
          bucket_script: {
            buckets_path: {
              sliValue: 'sli_value',
              objective: 'objective',
              errorBudgetRemaining: 'error_budget_remaining',
            },
            script:
              'if (params.sliValue == -1) { return 0 } else if (params.sliValue >= params.objective) { return 4 } else if (params.errorBudgetRemaining > 0) { return 2 } else { return 1 }',
          },
        },
      },
    },
  };
}

function generateAggregationsForCalendarAndOccurrences(slo: SLO) {
  return {
    period: {
      range: {
        field: '@timestamp',
        keyed: true,
        ranges: [
          {
            key: 'last',
          },
        ],
      },
      aggs: {
        total_events_estimated: {
          bucket_script: {
            buckets_path: {
              totalEvents: 'total_events',
            },
            script: {
              params: {
                calendar: slo.timeWindow.duration.unit === DurationUnit.Week ? 'week' : 'month',
              },
              source: `
                if (params.calendar == "month") {
                  Date d = new Date(); 
                  Instant instant = Instant.ofEpochMilli(d.getTime());
              
                  LocalDateTime now = LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
                  LocalDateTime startOfMonth = now
                    .withDayOfMonth(1)
                    .withHour(0)
                    .withMinute(0)
                    .withSecond(0);
                  LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);
      
                  long elapsedDuration = Duration.between(startOfMonth, now).toMinutes();
                  long monthDuration = Duration.between(startOfMonth, startOfNextMonth).toMinutes();
                  return params.totalEvents / elapsedDuration * monthDuration;
                } else if (params.calendar == "week") {
                  Date d = new Date(); 
                  Instant instant = Instant.ofEpochMilli(d.getTime());
              
                  LocalDateTime now = LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
                  LocalDateTime startOfWeek = now
                    .with(DayOfWeek.MONDAY)
                    .withHour(0)
                    .withMinute(0)
                    .withSecond(0);
                  long elapsedDuration = Duration.between(startOfWeek, now).toMinutes();
                  long weekDuration = 7 * 24 * 60;
                  return params.totalEvents / elapsedDuration * weekDuration;
                }
              `,
            },
          },
        },
        good_events: {
          sum: {
            field: 'slo.numerator',
          },
        },
        total_events: {
          sum: {
            field: 'slo.denominator',
          },
        },
        objective: {
          max: {
            field: 'objective',
          },
        },
        sli_value: {
          bucket_script: {
            buckets_path: {
              goodEvents: 'good_events',
              totalEvents: 'total_events',
            },
            script:
              'if (params.totalEvents == 0) { return -1 } else { return params.goodEvents / params.totalEvents }',
          },
        },
        error_budget_initial: {
          bucket_script: {
            buckets_path: {
              objective: 'objective',
            },
            script: '1 - params.objective',
          },
        },
        error_budget_consumed: {
          bucket_script: {
            buckets_path: {
              goodEvents: 'good_events',
              totalEvents: 'total_events',
              totalEventsEstimated: 'total_events_estimated',
              errorBudgetInitial: 'error_budget_initial',
            },
            script:
              'if (params.totalEvents == 0) { return 0 } else { return (params.totalEvents - params.goodEvents) / (params.totalEventsEstimated * params.errorBudgetInitial) }',
          },
        },
        error_budget_remaining: {
          bucket_script: {
            buckets_path: {
              errorBudgetConsumed: 'error_budget_consumed',
            },
            script: '1 - params.errorBudgetConsumed',
          },
        },
        status: {
          bucket_script: {
            buckets_path: {
              sliValue: 'sli_value',
              objective: 'objective',
              errorBudgetRemaining: 'error_budget_remaining',
            },
            script:
              'if (params.sliValue == -1) { return 0 } else if (params.sliValue >= params.objective) { return 4 } else if (params.errorBudgetRemaining > 0) { return 2 } else { return 1 }',
          },
        },
      },
    },
  };
}
