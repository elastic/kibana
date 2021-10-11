/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../../task_manager/server';
import { LIST_DETECTION_RULE_EXCEPTION, TELEMETRY_CHANNEL_LISTS } from '../constants';
import { batchTelemetryRecords, templateExceptionList } from '../helpers';
import { TelemetryEventsSender } from '../sender';
import { TelemetryReceiver } from '../receiver';
import { ExceptionListItem, RuleSearchResult } from '../types';

export const TelemetryDetectionRuleListsTaskConstants = {
  TIMEOUT: '10m',
  TYPE: 'security:telemetry-detection-rules',
  INTERVAL: '24h',
  VERSION: '1.0.0',
};

const MAX_TELEMETRY_BATCH = 1_000;

export class TelemetryDetectionRulesTask {
  private readonly logger: Logger;
  private readonly sender: TelemetryEventsSender;
  private readonly receiver: TelemetryReceiver;

  constructor(
    logger: Logger,
    taskManager: TaskManagerSetupContract,
    sender: TelemetryEventsSender,
    receiver: TelemetryReceiver
  ) {
    this.logger = logger;
    this.sender = sender;
    this.receiver = receiver;

    taskManager.registerTaskDefinitions({
      [TelemetryDetectionRuleListsTaskConstants.TYPE]: {
        title: 'Security Solution Detection Rule Lists Telemetry',
        timeout: TelemetryDetectionRuleListsTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const { state } = taskInstance;

          return {
            run: async () => {
              const taskExecutionTime = moment().utc().toISOString();
              const hits = await this.runTask(taskInstance.id);

              return {
                state: {
                  lastExecutionTimestamp: taskExecutionTime,
                  runs: (state.runs || 0) + 1,
                  hits,
                },
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (taskManager: TaskManagerStartContract) => {
    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TelemetryDetectionRuleListsTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TelemetryDetectionRuleListsTaskConstants.INTERVAL,
        },
        state: { runs: 0 },
        params: { version: TelemetryDetectionRuleListsTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${TelemetryDetectionRuleListsTaskConstants.TYPE}:${TelemetryDetectionRuleListsTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string) => {
    if (taskId !== this.getTaskId()) {
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      return 0;
    }

    // Lists Telemetry: Detection Rules

    const { body: prebuiltRules } = await this.receiver.fetchDetectionRules();

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
        const listItem = await this.receiver.fetchDetectionExceptionList(ex.list_id, ruleVersion);
        for (const exceptionItem of listItem.data) {
          detectionRuleExceptions.push(exceptionItem);
        }
      }
    }

    const detectionRuleExceptionsJson = templateExceptionList(
      detectionRuleExceptions,
      LIST_DETECTION_RULE_EXCEPTION
    );

    batchTelemetryRecords(detectionRuleExceptionsJson, MAX_TELEMETRY_BATCH).forEach((batch) => {
      this.sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
    });

    return detectionRuleExceptions.length;
  };
}
