/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RulesClientContext } from '../types';
import { RuleDomain } from '../../application/rule/types';
import { parseDuration } from '../../../common/parse_duration';

const MS_PER_MINUTE = 60 * 1000;

export interface SchedulesIntervalAggregationResult {
  schedules: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>
  }
}

export const getScheduleFrequency = async (context:RulesClientContext): Promise<number> => {
  const response = await context.unsecuredSavedObjectsClient.find<RuleDomain, SchedulesIntervalAggregationResult>({
    type: 'alert',
    aggs: {
      schedules: {
        terms: {
          field: 'alert.attributes.schedule.interval'
        }
      }
    }
  });

  const buckets = response.aggregations?.schedules.buckets ?? [];

  return buckets.reduce((result, { key, doc_count: occurrence}) => {
    let scheduleInterval: number;

    try {
      // Normalize the interval (period) in terms of minutes
      scheduleInterval = parseDuration(key) / MS_PER_MINUTE
    } catch (e) {
      context.logger.warn(`Failed to parse rule schedule interval for schedule frequency calculation: ${e.message}`);
      return result;
    }

    // Divide by zero check, this shouldn't happen but it's defensive
    if (scheduleInterval !== 0) {
      return result + ((1 / scheduleInterval) * occurrence);      
    }

    return result;
  }, 0);
};
