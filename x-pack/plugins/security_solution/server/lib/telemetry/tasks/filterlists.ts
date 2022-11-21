/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TASK_METRICS_CHANNEL } from '../constants';
import type { ITelemetryEventsSender } from '../sender';
import type { TelemetryFilterListArtifact } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import { artifactService } from '../artifact';
import { filterList } from '../filterlists';
import { createTaskMetric, tlog } from '../helpers';

export function createTelemetryFilterListArtifactTaskConfig() {
  return {
    type: 'security:telemetry-filterlist-artifact',
    title: 'Security Solution Telemetry Filter List Artifact Task',
    interval: '45m',
    timeout: '1m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const startTime = Date.now();
      const taskName = 'Security Solution Telemetry Filter List Artifact Task';
      try {
        const artifactName = 'telemetry-filterlists-v1';
        const artifact = (await artifactService.getArtifact(
          artifactName
        )) as unknown as TelemetryFilterListArtifact;
        tlog(logger, `New filterlist artifact: ${JSON.stringify(artifact)}`);
        filterList.endpointAlerts = artifact.endpoint_alerts;
        filterList.exceptionLists = artifact.exception_lists;
        filterList.prebuiltRulesAlerts = artifact.prebuilt_rules_alerts;
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, startTime),
        ]);
        return 0;
      } catch (err) {
        tlog(logger, `Failed to set telemetry filterlist artifact due to ${err.message}`);
        filterList.resetAllToDefault();
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, startTime, err.message),
        ]);
        return 0;
      }
    },
  };
}
