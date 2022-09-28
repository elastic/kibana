/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  LIST_DETECTION_RULE_EXCEPTION,
  TELEMETRY_CHANNEL_LISTS,
  TASK_METRICS_CHANNEL,
} from '../constants';
import { batchTelemetryRecords, templateExceptionList, tlog, createTaskMetric } from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { ExceptionListItem, ESClusterInfo, ESLicense, RuleSearchResult } from '../types';
import type { TaskExecutionPeriod } from '../task';

export function createTelemetryDetectionRuleListsTaskConfig(maxTelemetryBatch: number) {
  return {
    type: 'security:telemetry-detection-rules',
    title: 'Security Solution Detection Rule Lists Telemetry',
    interval: '24h',
    timeout: '10m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const startTime = Date.now();
      const taskName = 'Security Solution Detection Rule Lists Telemetry';
      try {
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

        // Lists Telemetry: Detection Rules

        const { body: prebuiltRules } = await receiver.fetchDetectionRules();

        if (!prebuiltRules) {
          tlog(logger, 'no prebuilt rules found');
          await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
            createTaskMetric(taskName, true, startTime),
          ]);
          return 0;
        }

        const cacheArray = prebuiltRules.hits.hits.reduce((cache, searchHit) => {
          const rule = searchHit._source as RuleSearchResult;
          const ruleId = rule.alert.params.ruleId;

          const shouldNotProcess =
            rule === null ||
            rule === undefined ||
            ruleId === null ||
            ruleId === undefined ||
            searchHit._source?.alert.params.exceptionsList.length === 0;

          if (shouldNotProcess) {
            return cache;
          }

          cache.push(rule);
          return cache;
        }, [] as RuleSearchResult[]);

        const detectionRuleExceptions = [] as ExceptionListItem[];
        for (const item of cacheArray) {
          const ruleVersion = item.alert.params.version;

          for (const ex of item.alert.params.exceptionsList) {
            const listItem = await receiver.fetchDetectionExceptionList(ex.list_id, ruleVersion);
            for (const exceptionItem of listItem.data) {
              detectionRuleExceptions.push(exceptionItem);
            }
          }
        }

        const detectionRuleExceptionsJson = templateExceptionList(
          detectionRuleExceptions,
          clusterInfo,
          licenseInfo,
          LIST_DETECTION_RULE_EXCEPTION
        );
        tlog(logger, `Detection rule exception json length ${detectionRuleExceptionsJson.length}`);
        const batches = batchTelemetryRecords(detectionRuleExceptionsJson, maxTelemetryBatch);
        for (const batch of batches) {
          await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
        }
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, startTime),
        ]);
        return detectionRuleExceptions.length;
      } catch (err) {
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, startTime, err.message),
        ]);
        return 0;
      }
    },
  };
}
