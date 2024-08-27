/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleDetailsRoute, triggersActionsRoute } from '@kbn/rule-data-utils';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
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
import { CombinedSummarizedAlerts, ThrottledActions } from '../../types';
import { injectActionParams } from '../inject_action_params';
import { ActionSchedulerOptions, IActionScheduler, RuleUrl } from './types';
import {
  transformActionParams,
  TransformActionParamsOptions,
  transformSummaryActionParams,
} from '../transform_action_params';
import { Alert } from '../../alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAction,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
  RuleAlertData,
  RuleSystemAction,
} from '../../../common';
import {
  generateActionHash,
  getSummaryActionsFromTaskState,
  getSummaryActionTimeBounds,
  isActionOnInterval,
} from './rule_action_helper';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { ConnectorAdapter } from '../../connector_adapters/types';
import { withAlertingSpan } from '../lib';
import * as schedulers from './schedulers';

interface LogAction {
  id: string;
  typeId: string;
  alertId?: string;
  alertGroup?: string;
  alertSummary?: {
    new: number;
    ongoing: number;
    recovered: number;
  };
}

interface RunSummarizedActionArgs {
  action: RuleAction;
  summarizedAlerts: CombinedSummarizedAlerts;
  spaceId: string;
  bulkActions: EnqueueExecutionOptions[];
}

interface RunSystemActionArgs<Params extends RuleTypeParams> {
  action: RuleSystemAction;
  connectorAdapter: ConnectorAdapter;
  summarizedAlerts: CombinedSummarizedAlerts;
  rule: SanitizedRule<Params>;
  ruleProducer: string;
  spaceId: string;
  bulkActions: EnqueueExecutionOptions[];
}

interface RunActionArgs<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  action: RuleAction;
  alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
  ruleId: string;
  spaceId: string;
  bulkActions: EnqueueExecutionOptions[];
}

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
  private CHUNK_SIZE = 1000;
  private ruleTypeActionGroups?: Map<ActionGroupIds | RecoveryActionGroupId, string>;
  private previousStartedAt: Date | null;

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
    this.ruleTypeActionGroups = new Map(
      context.ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
    );
    this.previousStartedAt = context.previousStartedAt;

    for (const [_, scheduler] of Object.entries(schedulers)) {
      this.schedulers.push(new scheduler(context));
    }

    // sort schedulers by priority
    this.schedulers.sort((a, b) => a.priority - b.priority);
  }

  public async run(
    alerts: Record<string, Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>
  ): Promise<RunResult> {
    const throttledSummaryActions: ThrottledActions = getSummaryActionsFromTaskState({
      actions: this.context.rule.actions,
      summaryActions: this.context.taskInstance.state?.summaryActions,
    });

    const executables = [];
    for (const scheduler of this.schedulers) {
      executables.push(
        ...(await scheduler.generateExecutables({ alerts, throttledSummaryActions }))
      );
    }

    if (executables.length === 0) {
      return { throttledSummaryActions };
    }

    const {
      CHUNK_SIZE,
      context: {
        logger,
        alertingEventLogger,
        ruleRunMetricsStore,
        taskRunnerContext: { actionsConfigMap },
        taskInstance: {
          params: { spaceId, alertId: ruleId },
        },
      },
    } = this;

    const logActions: Record<string, LogAction> = {};
    const bulkActions: EnqueueExecutionOptions[] = [];
    let bulkActionsResponse: ExecutionResponseItem[] = [];

    this.context.ruleRunMetricsStore.incrementNumberOfGeneratedActions(executables.length);

    for (const { action, alert, summarizedAlerts } of executables) {
      const { actionTypeId } = action;

      ruleRunMetricsStore.incrementNumberOfGeneratedActionsByConnectorType(actionTypeId);
      if (ruleRunMetricsStore.hasReachedTheExecutableActionsLimit(actionsConfigMap)) {
        ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
          actionTypeId,
          status: ActionsCompletion.PARTIAL,
        });
        logger.debug(
          `Rule "${this.context.rule.id}" skipped scheduling action "${action.id}" because the maximum number of allowed actions has been reached.`
        );
        break;
      }

      if (
        ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType({
          actionTypeId,
          actionsConfigMap,
        })
      ) {
        if (!ruleRunMetricsStore.hasConnectorTypeReachedTheLimit(actionTypeId)) {
          logger.debug(
            `Rule "${this.context.rule.id}" skipped scheduling action "${action.id}" because the maximum number of allowed actions for connector type ${actionTypeId} has been reached.`
          );
        }
        ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
          actionTypeId,
          status: ActionsCompletion.PARTIAL,
        });
        continue;
      }

      if (!this.isExecutableAction(action)) {
        this.context.logger.warn(
          `Rule "${this.context.taskInstance.params.alertId}" skipped scheduling action "${action.id}" because it is disabled`
        );
        continue;
      }

      ruleRunMetricsStore.incrementNumberOfTriggeredActions();
      ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(actionTypeId);

      if (!this.isSystemAction(action) && summarizedAlerts) {
        const defaultAction = action as RuleAction;
        if (isActionOnInterval(action)) {
          throttledSummaryActions[defaultAction.uuid!] = { date: new Date().toISOString() };
        }

        logActions[defaultAction.id] = await this.runSummarizedAction({
          action,
          summarizedAlerts,
          spaceId,
          bulkActions,
        });
      } else if (summarizedAlerts && this.isSystemAction(action)) {
        const hasConnectorAdapter = this.context.taskRunnerContext.connectorAdapterRegistry.has(
          action.actionTypeId
        );
        /**
         * System actions without an adapter
         * cannot be executed
         *
         */
        if (!hasConnectorAdapter) {
          this.context.logger.warn(
            `Rule "${this.context.taskInstance.params.alertId}" skipped scheduling system action "${action.id}" because no connector adapter is configured`
          );

          continue;
        }

        const connectorAdapter = this.context.taskRunnerContext.connectorAdapterRegistry.get(
          action.actionTypeId
        );
        logActions[action.id] = await this.runSystemAction({
          action,
          connectorAdapter,
          summarizedAlerts,
          rule: this.context.rule,
          ruleProducer: this.context.ruleType.producer,
          spaceId,
          bulkActions,
        });
      } else if (!this.isSystemAction(action) && alert) {
        const defaultAction = action as RuleAction;
        logActions[defaultAction.id] = await this.runAction({
          action,
          spaceId,
          alert,
          ruleId,
          bulkActions,
        });

        const actionGroup = defaultAction.group;
        if (!this.isRecoveredAlert(actionGroup)) {
          if (isActionOnInterval(action)) {
            alert.updateLastScheduledActions(
              defaultAction.group as ActionGroupIds,
              generateActionHash(action),
              defaultAction.uuid
            );
          } else {
            alert.updateLastScheduledActions(defaultAction.group as ActionGroupIds);
          }
          alert.unscheduleActions();
        }
      }
    }

    if (!!bulkActions.length) {
      for (const c of chunk(bulkActions, CHUNK_SIZE)) {
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
          bulkActionsResponse = bulkActionsResponse.concat(
            enqueueResponse.items.filter(
              (i) => i.response === ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR
            )
          );
        }
      }
    }

    if (!!bulkActionsResponse.length) {
      for (const r of bulkActionsResponse) {
        if (r.response === ExecutionResponseType.QUEUED_ACTIONS_LIMIT_ERROR) {
          ruleRunMetricsStore.setHasReachedQueuedActionsLimit(true);
          ruleRunMetricsStore.decrementNumberOfTriggeredActions();
          ruleRunMetricsStore.decrementNumberOfTriggeredActionsByConnectorType(r.actionTypeId);
          ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
            actionTypeId: r.actionTypeId,
            status: ActionsCompletion.PARTIAL,
          });

          logger.debug(
            `Rule "${this.context.rule.id}" skipped scheduling action "${r.id}" because the maximum number of queued actions has been reached.`
          );

          delete logActions[r.id];
        }
      }
    }

    const logActionsValues = Object.values(logActions);
    if (!!logActionsValues.length) {
      for (const action of logActionsValues) {
        alertingEventLogger.logAction(action);
      }
    }

    return { throttledSummaryActions };
  }

  private async runSummarizedAction({
    action,
    summarizedAlerts,
    spaceId,
    bulkActions,
  }: RunSummarizedActionArgs): Promise<LogAction> {
    const { start, end } = getSummaryActionTimeBounds(
      action,
      this.context.rule.schedule,
      this.previousStartedAt
    );
    const ruleUrl = this.buildRuleUrl(spaceId, start, end);
    const actionToRun = {
      ...action,
      params: injectActionParams({
        actionTypeId: action.actionTypeId,
        ruleUrl,
        ruleName: this.context.rule.name,
        actionParams: transformSummaryActionParams({
          alerts: summarizedAlerts,
          rule: this.context.rule,
          ruleTypeId: this.context.ruleType.id,
          actionId: action.id,
          actionParams: action.params,
          spaceId,
          actionsPlugin: this.context.taskRunnerContext.actionsPlugin,
          actionTypeId: action.actionTypeId,
          kibanaBaseUrl: this.context.taskRunnerContext.kibanaBaseUrl,
          ruleUrl: ruleUrl?.absoluteUrl,
        }),
      }),
    };

    await this.actionRunOrAddToBulk({
      enqueueOptions: this.getEnqueueOptions(actionToRun),
      bulkActions,
    });

    return {
      id: action.id,
      typeId: action.actionTypeId,
      alertSummary: {
        new: summarizedAlerts.new.count,
        ongoing: summarizedAlerts.ongoing.count,
        recovered: summarizedAlerts.recovered.count,
      },
    };
  }

  private async runSystemAction({
    action,
    spaceId,
    connectorAdapter,
    summarizedAlerts,
    rule,
    ruleProducer,
    bulkActions,
  }: RunSystemActionArgs<Params>): Promise<LogAction> {
    const ruleUrl = this.buildRuleUrl(spaceId);

    const connectorAdapterActionParams = connectorAdapter.buildActionParams({
      alerts: summarizedAlerts,
      rule: {
        id: rule.id,
        tags: rule.tags,
        name: rule.name,
        consumer: rule.consumer,
        producer: ruleProducer,
      },
      ruleUrl: ruleUrl?.absoluteUrl,
      spaceId,
      params: action.params,
    });

    const actionToRun = Object.assign(action, { params: connectorAdapterActionParams });

    await this.actionRunOrAddToBulk({
      enqueueOptions: this.getEnqueueOptions(actionToRun),
      bulkActions,
    });

    return {
      id: action.id,
      typeId: action.actionTypeId,
      alertSummary: {
        new: summarizedAlerts.new.count,
        ongoing: summarizedAlerts.ongoing.count,
        recovered: summarizedAlerts.recovered.count,
      },
    };
  }

  private async runAction({
    action,
    spaceId,
    alert,
    ruleId,
    bulkActions,
  }: RunActionArgs<State, Context, ActionGroupIds, RecoveryActionGroupId>): Promise<LogAction> {
    const ruleUrl = this.buildRuleUrl(spaceId);
    const executableAlert = alert!;
    const actionGroup = action.group as ActionGroupIds;
    const transformActionParamsOptions: TransformActionParamsOptions = {
      actionsPlugin: this.context.taskRunnerContext.actionsPlugin,
      alertId: ruleId,
      alertType: this.context.ruleType.id,
      actionTypeId: action.actionTypeId,
      alertName: this.context.rule.name,
      spaceId,
      tags: this.context.rule.tags,
      alertInstanceId: executableAlert.getId(),
      alertUuid: executableAlert.getUuid(),
      alertActionGroup: actionGroup,
      alertActionGroupName: this.ruleTypeActionGroups!.get(actionGroup)!,
      context: executableAlert.getContext(),
      actionId: action.id,
      state: executableAlert.getState(),
      kibanaBaseUrl: this.context.taskRunnerContext.kibanaBaseUrl,
      alertParams: this.context.rule.params,
      actionParams: action.params,
      flapping: executableAlert.getFlapping(),
      ruleUrl: ruleUrl?.absoluteUrl,
    };

    if (executableAlert.isAlertAsData()) {
      transformActionParamsOptions.aadAlert = executableAlert.getAlertAsData();
    }
    const actionToRun = {
      ...action,
      params: injectActionParams({
        actionTypeId: action.actionTypeId,
        ruleUrl,
        ruleName: this.context.rule.name,
        actionParams: transformActionParams(transformActionParamsOptions),
      }),
    };

    await this.actionRunOrAddToBulk({
      enqueueOptions: this.getEnqueueOptions(actionToRun),
      bulkActions,
    });

    return {
      id: action.id,
      typeId: action.actionTypeId,
      alertId: alert.getId(),
      alertGroup: action.group,
    };
  }

  private isExecutableAction(action: RuleAction | RuleSystemAction) {
    return this.context.taskRunnerContext.actionsPlugin.isActionExecutable(
      action.id,
      action.actionTypeId,
      {
        notifyUsage: true,
      }
    );
  }

  private isSystemAction(action?: RuleAction | RuleSystemAction): action is RuleSystemAction {
    return this.context.taskRunnerContext.actionsPlugin.isSystemActionConnector(action?.id ?? '');
  }

  private isRecoveredAlert(actionGroup: string) {
    return actionGroup === this.context.ruleType.recoveryActionGroup.id;
  }

  private buildRuleUrl(spaceId: string, start?: number, end?: number): RuleUrl | undefined {
    if (!this.context.taskRunnerContext.kibanaBaseUrl) {
      return;
    }

    const relativePath = this.context.ruleType.getViewInAppRelativeUrl
      ? this.context.ruleType.getViewInAppRelativeUrl({ rule: this.context.rule, start, end })
      : `${triggersActionsRoute}${getRuleDetailsRoute(this.context.rule.id)}`;

    try {
      const basePathname = new URL(this.context.taskRunnerContext.kibanaBaseUrl).pathname;
      const basePathnamePrefix = basePathname !== '/' ? `${basePathname}` : '';
      const spaceIdSegment = spaceId !== 'default' ? `/s/${spaceId}` : '';

      const ruleUrl = new URL(
        [basePathnamePrefix, spaceIdSegment, relativePath].join(''),
        this.context.taskRunnerContext.kibanaBaseUrl
      );

      return {
        absoluteUrl: ruleUrl.toString(),
        kibanaBaseUrl: this.context.taskRunnerContext.kibanaBaseUrl,
        basePathname: basePathnamePrefix,
        spaceIdSegment,
        relativePath,
      };
    } catch (error) {
      this.context.logger.debug(
        `Rule "${this.context.rule.id}" encountered an error while constructing the rule.url variable: ${error.message}`
      );
      return;
    }
  }

  private getEnqueueOptions(action: RuleAction | RuleSystemAction): EnqueueExecutionOptions {
    const {
      context: {
        apiKey,
        ruleConsumer,
        executionId,
        taskInstance: {
          params: { spaceId, alertId: ruleId },
        },
      },
    } = this;

    const namespace = spaceId === 'default' ? {} : { namespace: spaceId };
    return {
      id: action.id,
      params: action.params,
      spaceId,
      apiKey: apiKey ?? null,
      consumer: ruleConsumer,
      source: asSavedObjectExecutionSource({
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
      }),
      executionId,
      relatedSavedObjects: [
        {
          id: ruleId,
          type: RULE_SAVED_OBJECT_TYPE,
          namespace: namespace.namespace,
          typeId: this.context.ruleType.id,
        },
      ],
      actionTypeId: action.actionTypeId,
    };
  }

  private async actionRunOrAddToBulk({
    enqueueOptions,
    bulkActions,
  }: {
    enqueueOptions: EnqueueExecutionOptions;
    bulkActions: EnqueueExecutionOptions[];
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
          bulkActions.push(enqueueOptions);
        }
      }
    } else {
      bulkActions.push(enqueueOptions);
    }
  }
}
