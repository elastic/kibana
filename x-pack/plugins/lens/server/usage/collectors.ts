/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { get } from 'lodash';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import { LensUsage, LensTelemetryState } from './types';
import { lensUsageSchema } from './schema';

const emptyUsageCollection = {
  saved_multiterms_overall: {},
  saved_multiterms_30_days: {},
  saved_multiterms_90_days: {},
  saved_overall: {},
  saved_30_days: {},
  saved_90_days: {},
  saved_overall_total: 0,
  saved_30_days_total: 0,
  saved_90_days_total: 0,
  events_30_days: {},
  events_90_days: {},
  suggestion_events_30_days: {},
  suggestion_events_90_days: {},
};

export function registerLensUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  const lensUsageCollector = usageCollection.makeUsageCollector<LensUsage>({
    type: 'lens',
    async fetch() {
      try {
        const docs = await getLatestTaskState(await taskManager);
        // get the accumulated state from the recurring task
        const state: LensTelemetryState = get(docs, '[0].state');

        const events = getDataByDate(state.byDate);
        const suggestions = getDataByDate(state.suggestionsByDate);

        return {
          ...emptyUsageCollection,
          ...state.saved,
          ...state.multiterms,
          events_30_days: events.last30,
          events_90_days: events.last90,
          suggestion_events_30_days: suggestions.last30,
          suggestion_events_90_days: suggestions.last90,
        };
      } catch (err) {
        return emptyUsageCollection;
      }
    },
    isReady: async () => {
      await taskManager;
      return true;
    },
    schema: lensUsageSchema,
  });

  usageCollection.registerCollector(lensUsageCollector);
}

function addEvents(prevEvents: Record<string, number>, newEvents: Record<string, number>) {
  Object.keys(newEvents).forEach((key) => {
    prevEvents[key] = (prevEvents[key] || 0) + newEvents[key];
  });
}

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.fetch({
      query: { bool: { filter: { term: { _id: `task:Lens-lens_telemetry` } } } },
    });
    return result.docs;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

function getDataByDate(dates: Record<string, Record<string, number>>) {
  const byDate = Object.keys(dates || {}).map((dateStr) => parseInt(dateStr, 10));

  const last30: Record<string, number> = {};
  const last90: Record<string, number> = {};

  const last30Timestamp = moment().subtract(30, 'days').unix();
  const last90Timestamp = moment().subtract(90, 'days').unix();

  byDate.forEach((dateKey) => {
    if (dateKey >= last30Timestamp) {
      addEvents(last30, dates[dateKey]);
      addEvents(last90, dates[dateKey]);
    } else if (dateKey > last90Timestamp) {
      addEvents(last90, dates[dateKey]);
    }
  });

  return {
    last30,
    last90,
  };
}
