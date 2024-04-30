/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { LIST_DETECTION_RULE_EXCEPTION, TELEMETRY_CHANNEL_LISTS } from '../constants';
import {
  batchTelemetryRecords,
  templateExceptionList,
  newTelemetryLogger,
  createUsageCounterLabel,
  safeValue,
} from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { ExceptionListItem, RuleSearchResult } from '../types';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';

export function createTelemetryDetectionRuleListsTaskConfig(maxTelemetryBatch: number) {
  const taskName = 'Security Solution Detection Rule Lists Telemetry';
  const taskType = 'security:telemetry-detection-rules';
  return {
    type: taskType,
    title: taskName,
    interval: '24h',
    timeout: '10m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const log = newTelemetryLogger(logger.get('detection_rule'));
      const usageCollector = sender.getTelemetryUsageCluster();
      const usageLabelPrefix: string[] = ['security_telemetry', 'detection-rules'];
      const trace = taskMetricsService.start(taskType);

      log.l(
        `Running task: ${taskId} [last: ${taskExecutionPeriod.last} - current: ${taskExecutionPeriod.current}]`
      );

      try {
        const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
        ]);

        const clusterInfo = safeValue(clusterInfoPromise);
        const licenseInfo = safeValue(licenseInfoPromise);

        // Lists Telemetry: Detection Rules

        const { body: prebuiltRules } = await receiver.fetchDetectionRules();

        if (!prebuiltRules) {
          log.l('no prebuilt rules found');
          taskMetricsService.end(trace);
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
        log.l(`Detection rule exception json length ${detectionRuleExceptionsJson.length}`);

        usageCollector?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelPrefix),
          counterType: 'detection_rule_count',
          incrementBy: detectionRuleExceptionsJson.length,
        });

        const batches = batchTelemetryRecords(
          cloneDeep(detectionRuleExceptionsJson),
          maxTelemetryBatch
        );
        for (const batch of batches) {
          await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
        }
        taskMetricsService.end(trace);

        log.l(
          `Task: ${taskId} executed.  Processed ${detectionRuleExceptionsJson.length} exceptions`
        );

        return detectionRuleExceptionsJson.length;
      } catch (err) {
        taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
