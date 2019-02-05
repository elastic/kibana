/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMapsTelemetry } from './maps_telemetry';

const TELEMETRY_TASK_TYPE = 'maps_telemetry';

export const TASK_ID = `Maps-${TELEMETRY_TASK_TYPE}`;

export function scheduleTask(server, taskManager) {
  const { kbnServer } = server.plugins.xpack_main.status.plugin;

  kbnServer.afterPluginsInit(() => {
    taskManager.schedule({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      state: { stats: {}, runs: 0 },
    });
  });
}

export function registerMapsTelemetryTask(taskManager) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Maps telemetry fetch task',
      type: TELEMETRY_TASK_TYPE,
      timeout: '1m',
      numWorkers: 2,
      createTaskRunner: telemetryTaskRunner(),
    },
  });
}

export function telemetryTaskRunner() {

  return ({ kbnServer, taskInstance }) => {
    const { state } = taskInstance;
    const prevState = state;
    const { server } = kbnServer;
    let mapsTelemetry = {};

    const callCluster = server.plugins.elasticsearch.getCluster('admin')
      .callWithInternalUser;

    return {
      async run() {
        try {
          mapsTelemetry = await getMapsTelemetry(server, callCluster);
        } catch (err) {
          server.log(['warning'], `Error loading maps telemetry: ${err}`);
        } finally {
          return {
            state: {
              runs: state.runs || 0 + 1,
              stats: mapsTelemetry.attributes || prevState.stats || {},
            },
            runAt: getNextMidnight(),
          };
        }
      },
    };
  };
}

export function getNextMidnight() {
  const nextMidnight = new Date();
  nextMidnight.setHours(0, 0, 0, 0);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  return nextMidnight.toISOString();
}