/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { RulesClientContext } from '../../../../rules_client/types';
import { RuleDomain } from '../../types';
import { convertDurationToFrequency } from '../../../../../common/parse_duration';
import { GetScheduleFrequencyResult } from './types';
import { getSchemaFrequencyResultSchema } from './schema';

export interface SchedulesIntervalAggregationResult {
  schedule_intervals: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

const convertIntervalToFrequency = (context: RulesClientContext, schedule: string) => {
  let scheduleFrequency = 0;

  try {
    // Normalize the interval (period) in terms of minutes
    scheduleFrequency = convertDurationToFrequency(schedule);
  } catch (e) {
    context.logger.warn(
      `Failed to parse rule schedule interval for schedule frequency calculation: ${e.message}`
    );
  }

  return scheduleFrequency;
};

export const getScheduleFrequency = async (
  context: RulesClientContext
): Promise<GetScheduleFrequencyResult> => {
  const response = await context.internalSavedObjectsRepository.find<
    RuleDomain,
    SchedulesIntervalAggregationResult
  >({
    type: RULE_SAVED_OBJECT_TYPE,
    filter: 'alert.attributes.enabled: true',
    namespaces: ['*'],
    aggs: {
      schedule_intervals: {
        terms: {
          field: 'alert.attributes.schedule.interval',
        },
      },
    },
  });

  const buckets = response.aggregations?.schedule_intervals.buckets ?? [];

  const totalScheduledPerMinute = buckets.reduce((result, { key, doc_count: occurrence }) => {
    const scheduleFrequency = convertIntervalToFrequency(context, key);

    // Sum up all of the frequencies, since this is an aggregation.
    return result + scheduleFrequency * occurrence;
  }, 0);

  const result = {
    totalScheduledPerMinute,
    remainingSchedulesPerMinute: Math.max(
      context.maxScheduledPerMinute - totalScheduledPerMinute,
      0
    ),
  };

  try {
    getSchemaFrequencyResultSchema.validate(result);
  } catch (e) {
    context.logger.warn(`Error validating rule schedules per minute: ${e}`);
  }

  return result;
};

interface ValidateScheduleLimitParams {
  context: RulesClientContext;
  prevInterval?: string | string[];
  updatedInterval: string | string[];
}

export type ValidateScheduleLimitResult = { interval: number; intervalAvailable: number } | null;

export const validateScheduleLimit = async (
  params: ValidateScheduleLimitParams
): Promise<ValidateScheduleLimitResult> => {
  const { context, prevInterval = [], updatedInterval = [] } = params;

  const prevIntervalArray = Array.isArray(prevInterval) ? prevInterval : [prevInterval];
  const updatedIntervalArray = Array.isArray(updatedInterval) ? updatedInterval : [updatedInterval];

  const prevSchedulePerMinute = prevIntervalArray.reduce((result, interval) => {
    const scheduleFrequency = convertIntervalToFrequency(context, interval);
    return result + scheduleFrequency;
  }, 0);

  const updatedSchedulesPerMinute = updatedIntervalArray.reduce((result, interval) => {
    const scheduleFrequency = convertIntervalToFrequency(context, interval);
    return result + scheduleFrequency;
  }, 0);

  const { remainingSchedulesPerMinute } = await getScheduleFrequency(context);

  // Compute the new remaining schedules per minute if we are editing rules.
  // So we add back the edited schedules, since we assume those are being edited.
  const computedRemainingSchedulesPerMinute = remainingSchedulesPerMinute + prevSchedulePerMinute;

  if (computedRemainingSchedulesPerMinute < updatedSchedulesPerMinute) {
    return {
      interval: updatedSchedulesPerMinute,
      intervalAvailable: remainingSchedulesPerMinute,
    };
  }

  return null;
};
