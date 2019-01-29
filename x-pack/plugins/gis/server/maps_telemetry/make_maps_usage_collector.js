/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMapsTelemetry } from './maps_telemetry';
import _ from 'lodash';

const TELEMETRY_TASK_TYPE = 'maps_telemetry';
const TASK_ID = `Maps-${TELEMETRY_TASK_TYPE}`;

export function initTelemetryCollection(server) {
  const { taskManager } = server;

  registerMapsTelemetryTask(taskManager);
  scheduleTasks(server, taskManager);
  makeMapsUsageCollector(server);
}

function makeMapsUsageCollector(server) {

  const mapsUsageCollector = server.usage.collectorSet.makeUsageCollector({
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

      return _.get(docs, '[0].state.telemetry');
    },
  });
  server.usage.collectorSet.register(mapsUsageCollector);
}

function registerMapsTelemetryTask(taskManager) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Maps telemetry fetch task',
      type: TELEMETRY_TASK_TYPE,
      timeout: '1m',
      numWorkers: 2,

      createTaskRunner: ({ kbnServer, taskInstance }) => ({
        async run() {
          const { state } = taskInstance;
          const prevState = state;
          let mapsTelemetry = {};

          const callCluster = kbnServer.server.plugins.elasticsearch
            .getCluster('admin').callWithInternalUser;
          const { server } = kbnServer;
          try {
            mapsTelemetry = await getMapsTelemetry(server, callCluster);
          } catch (err) {
            server.log(['warning'], `Error loading maps telemetry: ${err}`);
          }

          return {
            state: {
              runs: taskInstance.state.runs + 1,
              telemetry: mapsTelemetry.attributes || prevState.telemetry || {},
            },
            runAt: getNextMidnight(),
          };
        },
      }),
    },
  });
}

function scheduleTasks(server, taskManager) {
  const { kbnServer } = server.plugins.xpack_main.status.plugin;

  kbnServer.afterPluginsInit(() => {
    taskManager.schedule({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      state: { telemetry: {}, runs: 0 },
    });
  });
}

export function getNextMidnight() {
  const nextMidnight = new Date();
  nextMidnight.setHours(0, 0, 0, 0);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  return nextMidnight.toISOString();
}