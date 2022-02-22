/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { ITelemetryEventsSender } from '../sender';
import { ITelemetryReceiver } from '../receiver';
import type { ESClusterInfo, ESLicense } from '../types';
import { TaskExecutionPeriod } from '../task';

/**
 * ~~ Detection Rule Alerts Telemetry
 *
 *   - [ ] Collect alert telemetry from Elastic pre-built rule alerts
 *   - [ ] Filter out custom rule alerts
 *   - [ ] Filter out Endpoint rules
 *   - [ ] Run through filter list
 *
 * Rule Types:
 *
 *   - query
 *   - eql
 *   - machine_learning
 *   - threshold
 *   - threat_match
 */
export function createTelemetryDetectionRuleAlertsTaskConfig(maxTelemetryBatch: number) {
  return {
    type: 'security:telemetry-detection-rule-alerts',
    title: 'Security Solution - Prebuilt Detection Rule Alerts Telemetry',
    interval: '3h',
    timeout: '10m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
        receiver.fetchClusterInfo(),
        receiver.fetchLicenseInfo(),
      ]);

      const clusterInfo =
        clusterInfoPromise.status === 'fulfilled'
          ? clusterInfoPromise.value
          : ({} as ESClusterInfo);
      const licenseInfo =
        licenseInfoPromise.status === 'fulfilled'
          ? licenseInfoPromise.value
          : ({} as ESLicense | undefined);

      // Alerts Telemetry: Detection Rules
      logger.info(
        `drule alerts task. Cluster UUID: ${clusterInfo.cluster_uuid}; Cluster Info: ${clusterInfo.cluster_name}`
      );
      logger.info(`drule alerts task. License Info: ${licenseInfo?.uid}`);

      return 1;
    },
  };
}
