/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTaskRunError,
  isEphemeralTaskRejectedDueToCapacityError,
  TaskErrorSource,
} from '@kbn/task-manager-plugin/server';
import {
  ExecuteOptions as EnqueueExecutionOptions,
  ExecutionResponseItem,
  ExecutionResponseType,
} from '@kbn/actions-plugin/server/create_execute_function';
import { ActionsCompletion } from '@kbn/alerting-state-types';
import { chunk } from 'lodash';
import { ThrottledActions } from '../../types';
import { ActionSchedulerOptions, ActionsToSchedule, IActionScheduler } from './types';
import { Alert } from '../../alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
  RuleAlertData,
} from '../../../common';
import { getSummaryActionsFromTaskState } from './lib';
import { withAlertingSpan } from '../lib';
import * as schedulers from './schedulers';

const BULK_SCHEDULE_CHUNK_SIZE = 1000;

export interface RunResult {
  throttledSummaryActions: ThrottledActions;
}

export class ActionScheduler<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  private readonly schedulers: Array<
    IActionScheduler<State, Context, ActionGroupIds, RecoveryActionGroupId>
  > = [];

  private ephemeralActionsToSchedule: number;

  constructor(
    private readonly context: ActionSchedulerOptions<
      Params,
      ExtractedParams,
      RuleState,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >
  ) {
    this.ephemeralActionsToSchedule = context.taskRunnerContext.maxEphemeralActionsPerRule;
    for (const [_, scheduler] of Object.entries(schedulers)) {
      this.schedulers.push(new scheduler(context));
    }

    // sort schedulers by priority
    this.schedulers.sort((a, b) => a.priority - b.priority);
  }

  public async run({
    activeCurrentAlerts,
    recoveredCurrentAlerts,
  }: {
    activeCurrentAlerts?: Record<string, Alert<State, Context, ActionGroupIds>>;
    recoveredCurrentAlerts?: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  }): Promise<RunResult> {
    const throttledSummaryActions: ThrottledActions = getSummaryActionsFromTaskState({
      actions: this.context.rule.actions,
      summaryActions: this.context.taskInstance.state?.summaryActions,
    });

    const allActionsToScheduleResult: ActionsToSchedule[] = [];
    for (const scheduler of this.schedulers) {
      allActionsToScheduleResult.push(
        ...(await scheduler.getActionsToSchedule({
          activeCurrentAlerts,
          recoveredCurrentAlerts,
          throttledSummaryActions,
        }))
      );
    }

    if (allActionsToScheduleResult.length === 0) {
      return { throttledSummaryActions };
    }

    const bulkScheduleRequest: EnqueueExecutionOptions[] = [];

    for (const result of allActionsToScheduleResult) {
      await this.runActionAsEphemeralOrAddToBulkScheduleRequest({
        enqueueOptions: result.actionToEnqueue,
        bulkScheduleRequest,
      });
    }

    let bulkScheduleResponse: ExecutionResponseItem[] = [];

    if (!!bulkScheduleRequest.length) {
      for (const c of chunk(bulkScheduleRequest, BULK_SCHEDULE_CHUNK_SIZE)) {
        let enqueueResponse;
        try {
          enqueueResponse = await withAlertingSpan('alerting:bulk-enqueue-actions', () =>
            this.context.actionsClient!.bulkEnqueueExecution(c)
          );
        } catch (e) {
          if (e.statusCode === 404) {
            throw createTaskRunError(e, TaskErrorSource.USER);
          }
          throw createTaskRunError(e, TaskErrorSource.FRAMEWORK);
        }
        if (enqueueResponse.errors) {
          bulkScheduleResponse = bulkScheduleResponse.concat(
            enqueueResponse.items.filter(
              (i) => i.response === ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR
            )
          );
        }
      }
    }

    const actionsToNotLog: string[] = [];
    if (!!bulkScheduleResponse.length) {
      for (const r of bulkScheduleResponse) {
        if (r.response === ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR) {
          this.context.ruleRunMetricsStore.setHasReachedQueuedActionsLimit(true);
          this.context.ruleRunMetricsStore.decrementNumberOfTriggeredActions();
          this.context.ruleRunMetricsStore.decrementNumberOfTriggeredActionsByConnectorType(
            r.actionTypeId
          );
          this.context.ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
            actionTypeId: r.actionTypeId,
            status: ActionsCompletion.PARTIAL,
          });

          this.context.logger.debug(
            `Rule "${this.context.rule.id}" skipped scheduling action "${r.id}" because the maximum number of queued actions has been reached.`
          );

          const uuid = r.uuid;
          // uuid is typed as optional but in reality it is always
          // populated - https://github.com/elastic/kibana/issues/195255
          if (uuid) {
            actionsToNotLog.push(uuid);
          }
        }
      }
    }

    const actionsToLog = allActionsToScheduleResult.filter(
      (result) => result.actionToLog.uuid && !actionsToNotLog.includes(result.actionToLog.uuid)
    );

    if (!!actionsToLog.length) {
      for (const action of actionsToLog) {
        this.context.alertingEventLogger.logAction(action.actionToLog);
      }
    }

    return { throttledSummaryActions };
  }

  private async runActionAsEphemeralOrAddToBulkScheduleRequest({
    enqueueOptions,
    bulkScheduleRequest,
  }: {
    enqueueOptions: EnqueueExecutionOptions;
    bulkScheduleRequest: EnqueueExecutionOptions[];
  }) {
    if (
      this.context.taskRunnerContext.supportsEphemeralTasks &&
      this.ephemeralActionsToSchedule > 0
    ) {
      this.ephemeralActionsToSchedule--;
      try {
        await this.context.actionsClient!.ephemeralEnqueuedExecution(enqueueOptions);
      } catch (err) {
        if (isEphemeralTaskRejectedDueToCapacityError(err)) {
          bulkScheduleRequest.push(enqueueOptions);
        }
      }
    } else {
      bulkScheduleRequest.push(enqueueOptions);
    }
  }
}
