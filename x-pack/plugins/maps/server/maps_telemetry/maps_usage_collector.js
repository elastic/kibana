/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { TASK_ID, scheduleTask, registerMapsTelemetryTask } from './telemetry_task';

export function initTelemetryCollection(server) {
  registerMapsTelemetryTask(server.taskManager);
  scheduleTask(server, server.taskManager);
  registerMapsUsageCollector(server);
}

export function buildCollectorObj(server) {
  return {
    type: 'maps',
    fetch: async () => {
      let docs;
      try {
        ({ docs } = await server.taskManager.fetch({
          query: {
            bool: {
              filter: {
                term: {
                  _id: TASK_ID
                }
              }
            }
          }
        }));
      } catch (err) {
        const errMessage = err && err.message ? err.message : err.toString();
        /*
         * The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the task manager
         * has to wait for all plugins to initialize first.
         * It's fine to ignore it as next time around it will be initialized (or it will throw a different type of error)
         */
        if (errMessage.indexOf('NotInitialized') >= 0) {
          docs = {};
        } else {
          throw err;
        }
      }

      return _.get(docs, '[0].state.stats');
    },
  };
}

export function registerMapsUsageCollector(server) {
  const collectorObj = buildCollectorObj(server);
  const mapsUsageCollector = server.usage.collectorSet
    .makeUsageCollector(collectorObj);
  server.usage.collectorSet.register(mapsUsageCollector);
}