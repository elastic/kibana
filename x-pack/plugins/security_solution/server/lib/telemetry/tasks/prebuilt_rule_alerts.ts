/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { ITaskMetricsService } from '../task_metrics.types';
import type { ESClusterInfo, ESLicense, TelemetryEvent } from '../types';
import type { TaskExecutionPeriod } from '../task';
import { TELEMETRY_CHANNEL_DETECTION_ALERTS } from '../constants';
import { batchTelemetryRecords, processK8sUsernames, newTelemetryLogger } from '../helpers';
import { copyAllowlistedFields, filterList } from '../filterlists';

export function createTelemetryPrebuiltRuleAlertsTaskConfig(maxTelemetryBatch: number) {
  const taskName = 'Security Solution - Prebuilt Rule and Elastic ML Alerts Telemetry';
  const taskVersion = '1.2.0';
  const taskType = 'security:telemetry-prebuilt-rule-alerts';
  return {
    type: taskType,
    title: taskName,
    interval: '1h',
    timeout: '15m',
    version: taskVersion,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const log = newTelemetryLogger(logger.get('prebuilt_rule_alerts'));
      const trace = taskMetricsService.start(taskType);

      log.l(
        `Running task: ${taskId} [last: ${taskExecutionPeriod.last} - current: ${taskExecutionPeriod.current}]`
      );

      try {
        const [clusterInfoPromise, licenseInfoPromise, packageVersion] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
          receiver.fetchDetectionRulesPackageVersion(),
        ]);

        const clusterInfo =
          clusterInfoPromise.status === 'fulfilled'
            ? clusterInfoPromise.value
            : ({} as ESClusterInfo);
        const licenseInfo =
          licenseInfoPromise.status === 'fulfilled'
            ? licenseInfoPromise.value
            : ({} as ESLicense | undefined);
        const packageInfo =
          packageVersion.status === 'fulfilled' ? packageVersion.value : undefined;
        const index = receiver.getAlertsIndex();

        if (index === undefined) {
          log.l(`alerts index is not ready yet, skipping telemetry task`);
          taskMetricsService.end(trace);
          return 0;
        }

        let fetchMore = true;
        let searchAfterValue: SortResults | undefined;
        let pitId = await receiver.openPointInTime(index);

        while (fetchMore) {
          const { moreToFetch, newPitId, searchAfter, alerts } =
            await receiver.fetchPrebuiltRuleAlertsBatch(pitId, searchAfterValue);

          if (alerts.length === 0) {
            taskMetricsService.end(trace);
            return 0;
          }

          fetchMore = moreToFetch;
          searchAfterValue = searchAfter;
          pitId = newPitId;

          const processedAlerts = alerts.map(
            (event: TelemetryEvent): TelemetryEvent =>
              copyAllowlistedFields(filterList.prebuiltRulesAlerts, event)
          );

          const sanitizedAlerts = processedAlerts.map(
            (event: TelemetryEvent): TelemetryEvent =>
              processK8sUsernames(clusterInfo?.cluster_uuid, event)
          );

          const enrichedAlerts = sanitizedAlerts.map(
            (event: TelemetryEvent): TelemetryEvent => ({
              ...event,
              licence_id: licenseInfo?.uid,
              cluster_uuid: clusterInfo?.cluster_uuid,
              cluster_name: clusterInfo?.cluster_name,
              package_version: packageInfo?.version,
              task_version: taskVersion,
            })
          );

          log.l(`sending ${enrichedAlerts.length} elastic prebuilt alerts`);
          const batches = batchTelemetryRecords(enrichedAlerts, maxTelemetryBatch);

          const promises = batches.map(async (batch) => {
            sender.sendOnDemand(TELEMETRY_CHANNEL_DETECTION_ALERTS, batch);
          });

          await Promise.all(promises);
        }

        taskMetricsService.end(trace);
        await receiver.closePointInTime(pitId);
        return 0;
      } catch (err) {
        logger.error('could not complete prebuilt alerts telemetry task');
        taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
