/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { LIST_DETECTION_RULE_EXCEPTION, TELEMETRY_CHANNEL_LISTS } from '../constants';
import { batchTelemetryRecords, templateExceptionList } from '../helpers';
import { TelemetryEventsSender } from '../sender';
import { TelemetryReceiver } from '../receiver';
import { ExceptionListItem, RuleSearchResult } from '../types';
import { TaskExecutionPeriod } from '../task';

export function createTelemetryDetectionRuleActionsTaskConfig(maxTelemetryBatch: number) {
  return {
    type: 'security:telemetry-detection-rules',
    title: 'Security Solution Detection Rule Actions Telemetry',
    interval: '24h',
    timeout: '10m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: TelemetryReceiver,
      sender: TelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      // Lists Telemetry: Detection Rules

      const { body: prebuiltRules } = await receiver.fetchDetectionRules();

      if (!prebuiltRules) {
        logger.debug('no prebuilt rules found');
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
        LIST_DETECTION_RULE_EXCEPTION
      );

      batchTelemetryRecords(detectionRuleExceptionsJson, maxTelemetryBatch).forEach((batch) => {
        sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
      });

      return detectionRuleExceptions.length;
    },
  };
}
