/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { getRuleDetailsRoute, triggersActionsRoute } from '@kbn/rule-data-utils';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { isEphemeralTaskRejectedDueToCapacityError } from '@kbn/task-manager-plugin/server';
import { ExecuteOptions as EnqueueExecutionOptions } from '@kbn/actions-plugin/server/create_execute_function';
import { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { chunk } from 'lodash';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RawRule } from '../types';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { injectActionParams } from './inject_action_params';
import { ExecutionHandlerOptions, RuleTaskInstance } from './types';
import { TaskRunnerContext } from './task_runner_factory';
import { transformActionParams } from './transform_action_params';
import { Alert } from '../alert';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  ActionsCompletion,
  AlertInstanceContext,
  AlertInstanceState,
  RuleAction,
  RuleTypeParams,
  RuleTypeState,
  SanitizedRule,
} from '../../common';

enum Reasons {
  MUTED = 'muted',
  THROTTLED = 'throttled',
  ACTION_GROUP_NOT_CHANGED = 'actionGroupHasNotChanged',
}

export class ExecutionHandler<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private logger: Logger;
  private alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
  private rule: SanitizedRule<Params>;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  private taskRunnerContext: TaskRunnerContext;
  private taskInstance: RuleTaskInstance;
  private ruleRunMetricsStore: RuleRunMetricsStore;
  private apiKey: RawRule['apiKey'];
  private ruleConsumer: string;
  private executionId: string;
  private ruleLabel: string;
  private ephemeralActionsToSchedule: number;
  private CHUNK_SIZE = 1000;
  private skippedAlerts: { [key: string]: { reason: string } } = {};
  private actionsClient: PublicMethodsOf<ActionsClient>;
  private ruleTypeActionGroups?: Map<ActionGroupIds | RecoveryActionGroupId, string>;
  private mutedAlertIdsSet: Set<string> = new Set();

  constructor({
    rule,
    ruleType,
    logger,
    alertingEventLogger,
    taskRunnerContext,
    taskInstance,
    ruleRunMetricsStore,
    apiKey,
    ruleConsumer,
    executionId,
    ruleLabel,
    actionsClient,
  }: ExecutionHandlerOptions<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >) {
    this.logger = logger;
    this.alertingEventLogger = alertingEventLogger;
    this.rule = rule;
    this.ruleType = ruleType;
    this.taskRunnerContext = taskRunnerContext;
    this.taskInstance = taskInstance;
    this.ruleRunMetricsStore = ruleRunMetricsStore;
    this.apiKey = apiKey;
    this.ruleConsumer = ruleConsumer;
    this.executionId = executionId;
    this.ruleLabel = ruleLabel;
    this.actionsClient = actionsClient;
    this.ephemeralActionsToSchedule = taskRunnerContext.maxEphemeralActionsPerRule;
    this.ruleTypeActionGroups = new Map(
      ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
    );
    this.mutedAlertIdsSet = new Set(rule.mutedInstanceIds);
  }

  public async run(
    alerts: Record<
      string,
      Alert<State, Context, ActionGroupIds> | Alert<State, Context, RecoveryActionGroupId>
    >
  ): Promise<void> {
    const executables = this.generateExecutables(alerts);

    if (!!executables.length) {
      const {
        CHUNK_SIZE,
        logger,
        alertingEventLogger,
        ruleRunMetricsStore,
        taskRunnerContext: { actionsConfigMap, actionsPlugin },
        taskInstance: {
          params: { spaceId, alertId: ruleId },
        },
      } = this;

      const logActions = [];
      const bulkActions: EnqueueExecutionOptions[] = [];

      this.ruleRunMetricsStore.incrementNumberOfGeneratedActions(executables.length);

      for (const { action, alert } of executables) {
        const { actionTypeId } = action;
        const actionGroup = action.group as ActionGroupIds;

        ruleRunMetricsStore.incrementNumberOfGeneratedActionsByConnectorType(actionTypeId);

        if (ruleRunMetricsStore.hasReachedTheExecutableActionsLimit(actionsConfigMap)) {
          ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
            actionTypeId,
            status: ActionsCompletion.PARTIAL,
          });
          logger.debug(
            `Rule "${this.rule.id}" skipped scheduling action "${action.id}" because the maximum number of allowed actions has been reached.`
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
              `Rule "${this.rule.id}" skipped scheduling action "${action.id}" because the maximum number of allowed actions for connector type ${actionTypeId} has been reached.`
            );
          }
          ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
            actionTypeId,
            status: ActionsCompletion.PARTIAL,
          });
          continue;
        }

        if (!this.isExecutableAction(action)) {
          this.logger.warn(
            `Rule "${this.taskInstance.params.alertId}" skipped scheduling action "${action.id}" because it is disabled`
          );
          continue;
        }

        ruleRunMetricsStore.incrementNumberOfTriggeredActions();
        ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(actionTypeId);

        const actionToRun = {
          ...action,
          params: injectActionParams({
            ruleId,
            spaceId,
            actionTypeId,
            actionParams: transformActionParams({
              actionsPlugin,
              alertId: ruleId,
              alertType: this.ruleType.id,
              actionTypeId,
              alertName: this.rule.name,
              spaceId,
              tags: this.rule.tags,
              alertInstanceId: alert.getId(),
              alertActionGroup: actionGroup,
              alertActionGroupName: this.ruleTypeActionGroups!.get(actionGroup)!,
              context: alert.getContext(),
              actionId: action.id,
              state: alert.getScheduledActionOptions()?.state || {},
              kibanaBaseUrl: this.taskRunnerContext.kibanaBaseUrl,
              alertParams: this.rule.params,
              actionParams: action.params,
              ruleUrl: this.buildRuleUrl(spaceId),
            }),
          }),
        };

        await this.actionRunOrAddToBulk({
          enqueueOptions: this.getEnqueueOptions(actionToRun),
          bulkActions,
        });

        logActions.push({
          id: action.id,
          typeId: action.actionTypeId,
          alertId: alert.getId(),
          alertGroup: action.group,
        });

        if (this.isRecoveredAlert(actionGroup)) {
          alert.scheduleActions(action.group as ActionGroupIds);
        } else {
          if (action.frequency?.throttle) {
            alert.updateLastScheduledActions(
              action.group as ActionGroupIds,
              this.generateActionHash(action)
            );
          } else {
            alert.updateLastScheduledActions(action.group as ActionGroupIds);
          }

          alert.unscheduleActions();
        }
      }

      if (!!bulkActions.length) {
        for (const c of chunk(bulkActions, CHUNK_SIZE)) {
          await this.actionsClient!.bulkEnqueueExecution(c);
        }
      }

      if (!!logActions.length) {
        for (const action of logActions) {
          alertingEventLogger.logAction(action);
        }
      }
    }
  }

  private generateExecutables(
    alerts: Record<string, Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>
  ) {
    const executables = [];

    for (const action of this.rule.actions) {
      for (const [alertId, alert] of Object.entries(alerts)) {
        const actionGroup = this.getActionGroup(alert);

        if (!this.ruleTypeActionGroups!.has(actionGroup)) {
          this.logger.error(
            `Invalid action group "${actionGroup}" for rule "${this.ruleType.id}".`
          );
          continue;
        }

        if (action.group === actionGroup && !this.isAlertMuted(alertId)) {
          if (
            this.isRecoveredAlert(action.group) ||
            this.isExecutableActiveAlert({ alert, action })
          ) {
            executables.push({ action, alert });
          }
        }
      }
    }

    return executables;
  }

  private getActionGroup(alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>) {
    return alert.getScheduledActionOptions()?.actionGroup || this.ruleType.recoveryActionGroup.id;
  }

  private isRecoveredAlert(actionGroup: string) {
    return actionGroup === this.ruleType.recoveryActionGroup.id;
  }

  private buildRuleUrl(spaceId: string): string | undefined {
    if (!this.taskRunnerContext.kibanaBaseUrl) {
      return;
    }

    try {
      const ruleUrl = new URL(
        `${
          spaceId !== 'default' ? `/s/${spaceId}` : ''
        }${triggersActionsRoute}${getRuleDetailsRoute(this.rule.id)}`,
        this.taskRunnerContext.kibanaBaseUrl
      );

      return ruleUrl.toString();
    } catch (error) {
      this.logger.debug(
        `Rule "${this.rule.id}" encountered an error while constructing the rule.url variable: ${error.message}`
      );
      return;
    }
  }

  private async actionRunOrAddToBulk({
    enqueueOptions,
    bulkActions,
  }: {
    enqueueOptions: EnqueueExecutionOptions;
    bulkActions: EnqueueExecutionOptions[];
  }) {
    if (this.taskRunnerContext.supportsEphemeralTasks && this.ephemeralActionsToSchedule > 0) {
      this.ephemeralActionsToSchedule--;
      try {
        await this.actionsClient!.ephemeralEnqueuedExecution(enqueueOptions);
      } catch (err) {
        if (isEphemeralTaskRejectedDueToCapacityError(err)) {
          bulkActions.push(enqueueOptions);
        }
      }
    } else {
      bulkActions.push(enqueueOptions);
    }
  }

  private getEnqueueOptions(action: RuleAction): EnqueueExecutionOptions {
    const {
      apiKey,
      ruleConsumer,
      executionId,
      taskInstance: {
        params: { spaceId, alertId: ruleId },
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
        type: 'alert',
      }),
      executionId,
      relatedSavedObjects: [
        {
          id: ruleId,
          type: 'alert',
          namespace: namespace.namespace,
          typeId: this.ruleType.id,
        },
      ],
    };
  }

  private isAlertMuted(alertId: string) {
    const muted = this.mutedAlertIdsSet.has(alertId);
    if (muted) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.MUTED)
      ) {
        this.logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${this.ruleLabel}: rule is muted`
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.MUTED };
      return true;
    }
    return false;
  }

  private isExecutableAction(action: RuleAction) {
    return this.taskRunnerContext.actionsPlugin.isActionExecutable(action.id, action.actionTypeId, {
      notifyUsage: true,
    });
  }

  private isExecutableActiveAlert({
    alert,
    action,
  }: {
    alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>;
    action: RuleAction;
  }) {
    const alertId = alert.getId();
    const { rule, ruleLabel, logger } = this;
    const notifyWhen = action.frequency?.notifyWhen || rule.notifyWhen;

    if (notifyWhen === 'onActionGroupChange' && !alert.scheduledActionGroupHasChanged()) {
      if (
        !this.skippedAlerts[alertId] ||
        (this.skippedAlerts[alertId] &&
          this.skippedAlerts[alertId].reason !== Reasons.ACTION_GROUP_NOT_CHANGED)
      ) {
        logger.debug(
          `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: alert is active but action group has not changed`
        );
      }
      this.skippedAlerts[alertId] = { reason: Reasons.ACTION_GROUP_NOT_CHANGED };
      return false;
    }

    if (notifyWhen === 'onThrottleInterval') {
      const throttled = action.frequency?.throttle
        ? alert.isThrottled({
            throttle: action.frequency.throttle ?? null,
            actionHash: this.generateActionHash(action),
          })
        : alert.isThrottled({ throttle: rule.throttle ?? null });

      if (throttled) {
        if (
          !this.skippedAlerts[alertId] ||
          (this.skippedAlerts[alertId] && this.skippedAlerts[alertId].reason !== Reasons.THROTTLED)
        ) {
          logger.debug(
            `skipping scheduling of actions for '${alertId}' in rule ${ruleLabel}: rule is throttled`
          );
        }
        this.skippedAlerts[alertId] = { reason: Reasons.THROTTLED };
        return false;
      }
    }

    return alert.hasScheduledActions();
  }

  private generateActionHash(action: RuleAction) {
    return `${action.actionTypeId}:${action.group}:${action.frequency?.throttle}`;
  }
}
