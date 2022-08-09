/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { cloneDeep, omit } from 'lodash';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import uuid from 'uuid';
import { KibanaRequest, Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  isEphemeralTaskRejectedDueToCapacityError,
  throwUnrecoverableError,
} from '@kbn/task-manager-plugin/server';
import { nanosToMillis } from '@kbn/event-log-plugin/server';
import moment from 'moment';
import { asSavedObjectExecutionSource } from '@kbn/actions-plugin/server';
import { injectActionParams } from './inject_action_params';
import { transformActionParams, transformSummarizedActionParams } from './transform_action_params';
import { TaskRunnerContext } from './task_runner_factory';
import { Alert, createAlertFactory } from '../alert';
import {
  ElasticsearchError,
  ErrorWithReason,
  executionStatusFromError,
  executionStatusFromState,
  isRuleSnoozed,
  processAlerts,
  ruleExecutionStatusToRaw,
} from '../lib';
import {
  ActionGroup,
  ActionsCompletion,
  IntervalSchedule,
  NotifyWhen,
  RawAlertInstance,
  RawRule,
  RawRuleExecutionStatus,
  RuleAction,
  RuleExecutionStatus,
  RuleExecutionStatusErrorReasons,
  RuleMonitoring,
  RuleMonitoringHistory,
  RulesClientApi,
  RuleTaskState,
  RuleTypeRegistry,
  SanitizedRule,
} from '../types';
import { asErr, asOk, map, promiseResult, resolveErr, Resultable } from '../lib/result_type';
import { getExecutionDurationPercentiles, getExecutionSuccessRatio } from '../lib/monitoring';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from '../lib/is_alerting_error';
import { partiallyUpdateAlert } from '../saved_objects';
import {
  AlertInstanceContext,
  AlertInstanceState,
  parseDuration,
  RuleTypeParams,
  RuleTypeState,
  WithoutReservedActionGroups,
} from '../../common';
import { NormalizedRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import { getEsErrorMessage } from '../lib/errors';
import { IN_MEMORY_METRICS, InMemoryMetrics } from '../monitoring';
import {
  GenerateNewAndRecoveredAlertEventsParams,
  LogActiveAndRecoveredAlertsParams,
  RuleRunResult,
  RuleTaskInstance,
  RuleTaskRunResult,
  RuleTaskStateAndMetrics,
} from './types';
import { createWrappedScopedClusterClientFactory } from '../lib/wrap_scoped_cluster_client';
import { IExecutionStatusAndMetrics } from '../lib/rule_execution_status';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { wrapSearchSourceClient } from '../lib/wrap_search_source_client';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { SearchMetrics } from '../lib/types';
import { loadRule } from './rule_loader';

const FALLBACK_RETRY_INTERVAL = '5m';
const CONNECTIVITY_RETRY_INTERVAL = '5m';

export const getDefaultRuleMonitoring = (): RuleMonitoring => ({
  execution: {
    history: [],
    calculated_metrics: {
      success_ratio: 0,
    },
  },
});

export class TaskRunner<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: RuleTaskInstance;
  private ruleConsumer: string | null;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  private readonly executionId: string;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly inMemoryMetrics: InMemoryMetrics;
  private alertingEventLogger: AlertingEventLogger;
  private usageCounter?: UsageCounter;
  private searchAbortController: AbortController;
  private cancelled: boolean;

  constructor(
    ruleType: NormalizedRuleType<
      Params,
      ExtractedParams,
      RuleState,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >,
    taskInstance: ConcreteTaskInstance,
    context: TaskRunnerContext,
    inMemoryMetrics: InMemoryMetrics
  ) {
    this.context = context;
    this.logger = context.logger;
    this.usageCounter = context.usageCounter;
    this.ruleType = ruleType;
    this.ruleConsumer = null;
    this.taskInstance = taskInstanceToAlertTaskInstance(taskInstance);
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.searchAbortController = new AbortController();
    this.cancelled = false;
    this.executionId = uuid.v4();
    this.inMemoryMetrics = inMemoryMetrics;
    this.alertingEventLogger = new AlertingEventLogger(this.context.eventLogger);
  }

  async run(): Promise<RuleTaskRunResult> {
    const {
      params: { alertId: ruleId, spaceId, consumer },
      startedAt,
      state: originalState,
      schedule: taskSchedule,
    } = this.taskInstance;

    // Initially use consumer as stored inside the task instance
    // Replace this with consumer as read from the rule saved object after
    // we successfully read the rule SO. This allows us to populate a consumer
    // value for `execute-start` events (which are written before the rule SO is read)
    // and in the event of decryption errors (where we cannot read the rule SO)
    // Because "consumer" is set when a rule is created, this value should be static
    // for the life of a rule but there may be edge cases where migrations cause
    // the consumer values to become out of sync.
    if (consumer) {
      this.ruleConsumer = consumer;
    }

    if (apm.currentTransaction) {
      apm.currentTransaction.name = `Execute Alerting Rule`;
      apm.currentTransaction.addLabels({
        alerting_rule_id: ruleId,
      });
    }

    const runDate = new Date();
    const runDateString = runDate.toISOString();
    this.logger.debug(`executing rule ${this.ruleType.id}:${ruleId} at ${runDateString}`);

    const namespace = this.context.spaceIdToNamespace(spaceId);

    this.alertingEventLogger.initialize({
      ruleId,
      ruleType: this.ruleType as UntypedNormalizedRuleType,
      consumer: this.ruleConsumer!,
      spaceId,
      executionId: this.executionId,
      taskScheduledAt: this.taskInstance.scheduledAt,
      ...(namespace ? { namespace } : {}),
    });

    this.alertingEventLogger.start();

    const { stateWithMetrics, schedule, monitoring } = await errorAsRuleTaskRunResult(
      this.loadRuleAttributesAndRun()
    );

    const ruleMonitoring =
      resolveErr<RuleMonitoring | undefined, Error>(monitoring, () => {
        return getDefaultRuleMonitoring();
      }) ?? getDefaultRuleMonitoring();

    const {
      status: executionStatus,
      metrics: executionMetrics,
      actions: triggeredActions,
    } = map<RuleTaskStateAndMetrics, ElasticsearchError, IExecutionStatusAndMetrics>(
      stateWithMetrics,
      (ruleRunStateWithMetrics) => executionStatusFromState(ruleRunStateWithMetrics, runDate),
      (err: ElasticsearchError) => executionStatusFromError(err, runDate)
    );

    if (apm.currentTransaction) {
      if (executionStatus.status === 'ok' || executionStatus.status === 'active') {
        apm.currentTransaction.setOutcome('success');
      } else if (executionStatus.status === 'error' || executionStatus.status === 'unknown') {
        apm.currentTransaction.setOutcome('failure');
      }
    }

    this.logger.debug(
      `ruleRunStatus for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(executionStatus)}`
    );
    if (executionMetrics) {
      this.logger.debug(
        `ruleRunMetrics for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(executionMetrics)}`
      );
    }

    this.alertingEventLogger.done({ status: executionStatus, metrics: executionMetrics });

    const monitoringHistory: RuleMonitoringHistory = {
      success: true,
      timestamp: +new Date(),
    };

    // set start and duration based on event log
    const { start, duration } = this.alertingEventLogger.getStartAndDuration();
    if (null != start) {
      executionStatus.lastExecutionDate = start;
    }
    if (null != duration) {
      executionStatus.lastDuration = nanosToMillis(duration);
      monitoringHistory.duration = executionStatus.lastDuration;
    }

    // if executionStatus indicates an error, fill in fields in
    // event from it
    if (executionStatus.error) {
      monitoringHistory.success = false;
    }

    ruleMonitoring.execution.history.push(monitoringHistory);
    ruleMonitoring.execution.calculated_metrics = {
      success_ratio: getExecutionSuccessRatio(ruleMonitoring),
      ...getExecutionDurationPercentiles(ruleMonitoring),
    };

    if (!this.cancelled) {
      this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_EXECUTIONS);
      if (executionStatus.error) {
        this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_FAILURES);
      }
      this.logger.debug(
        `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - ${JSON.stringify(
          executionStatus
        )}`
      );
      await this.updateRuleSavedObject(ruleId, namespace, {
        executionStatus: ruleExecutionStatusToRaw(executionStatus),
        monitoring: ruleMonitoring,
        actions: triggeredActions,
      });
    }

    const transformRunStateToTaskState = (
      runStateWithMetrics: RuleTaskStateAndMetrics
    ): RuleTaskState => {
      return {
        ...omit(runStateWithMetrics, ['metrics']),
        previousStartedAt: startedAt,
      };
    };

    return {
      state: map<RuleTaskStateAndMetrics, ElasticsearchError, RuleTaskState>(
        stateWithMetrics,
        (ruleRunStateWithMetrics: RuleTaskStateAndMetrics) =>
          transformRunStateToTaskState(ruleRunStateWithMetrics),
        (err: ElasticsearchError) => {
          const message = `Executing Rule ${spaceId}:${
            this.ruleType.id
          }:${ruleId} has resulted in Error: ${getEsErrorMessage(err)}`;
          if (isAlertSavedObjectNotFoundError(err, ruleId)) {
            this.logger.debug(message);
          } else {
            this.logger.error(message, {
              tags: [this.ruleType.id, ruleId, 'rule-run-failed'],
              error: { stack_trace: err.stack },
            });
          }
          return originalState;
        }
      ),
      schedule: resolveErr<IntervalSchedule | undefined, Error>(schedule, (error) => {
        if (isAlertSavedObjectNotFoundError(error, ruleId)) {
          const spaceMessage = spaceId ? `in the "${spaceId}" space ` : '';
          this.logger.warn(
            `Unable to execute rule "${ruleId}" ${spaceMessage}because ${error.message} - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
          );
          throwUnrecoverableError(error);
        }

        let retryInterval = taskSchedule?.interval ?? FALLBACK_RETRY_INTERVAL;

        // Set retry interval smaller for ES connectivity errors
        if (isEsUnavailableError(error, ruleId)) {
          retryInterval =
            parseDuration(retryInterval) > parseDuration(CONNECTIVITY_RETRY_INTERVAL)
              ? CONNECTIVITY_RETRY_INTERVAL
              : retryInterval;
        }

        return { interval: retryInterval };
      }),
      monitoring: ruleMonitoring,
    };
  }

  async cancel(): Promise<void> {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;

    // Write event log entry
    const {
      params: { alertId: ruleId, spaceId, consumer },
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);

    if (consumer && !this.ruleConsumer) {
      this.ruleConsumer = consumer;
    }

    this.logger.debug(
      `Cancelling rule type ${this.ruleType.id} with id ${ruleId} - execution exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`
    );

    this.logger.debug(
      `Aborting any in-progress ES searches for rule type ${this.ruleType.id} with id ${ruleId}`
    );
    this.searchAbortController.abort();

    this.alertingEventLogger.logTimeout();

    this.inMemoryMetrics.increment(IN_MEMORY_METRICS.RULE_TIMEOUTS);

    // Update the rule saved object with execution status
    const executionStatus: RuleExecutionStatus = {
      lastExecutionDate: new Date(),
      status: 'error',
      error: {
        reason: RuleExecutionStatusErrorReasons.Timeout,
        message: `${this.ruleType.id}:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`,
      },
    };
    this.logger.debug(
      `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - execution error due to timeout`
    );
    await this.updateRuleSavedObject(ruleId, namespace, {
      executionStatus: ruleExecutionStatusToRaw(executionStatus),
      actions: [],
    });
  }

  private async updateRuleSavedObject(
    ruleId: string,
    namespace: string | undefined,
    attributes: {
      executionStatus?: RawRuleExecutionStatus;
      monitoring?: RuleMonitoring;
      actions: RuleAction[];
    }
  ) {
    const client = this.context.internalSavedObjectsRepository;

    try {
      await partiallyUpdateAlert(client, ruleId, attributes, {
        ignore404: true,
        namespace,
        refresh: false,
      });
    } catch (err) {
      this.logger.error(`error updating rule for ${this.ruleType.id}:${ruleId} ${err.message}`);
    }
  }

  private shouldLogAndScheduleActionsForAlerts() {
    // if execution hasn't been cancelled, return true
    if (!this.cancelled) {
      return true;
    }

    // if execution has been cancelled, return true if EITHER alerting config or rule type indicate to proceed with scheduling actions
    return !this.context.cancelAlertsOnRuleTimeout || !this.ruleType.cancelAlertsOnRuleTimeout;
  }

  private countUsageOfActionExecutionAfterRuleCancellation() {
    if (this.cancelled && this.usageCounter) {
      if (this.context.cancelAlertsOnRuleTimeout && this.ruleType.cancelAlertsOnRuleTimeout) {
        // Increment usage counter for skipped actions
        this.usageCounter.incrementCounter({
          counterName: `alertsSkippedDueToRuleExecutionTimeout_${this.ruleType.id}`,
          incrementBy: 1,
        });
      }
    }
  }

  private async loadRuleAttributesAndRun(): Promise<Resultable<RuleRunResult, Error>> {
    const {
      params: { alertId: ruleId, spaceId },
    } = this.taskInstance;

    const { rule, fakeRequest, apiKey, rulesClient, validatedParams } = await loadRule<Params>({
      paramValidator: this.ruleType.validate?.params,
      ruleId,
      spaceId,
      context: this.context,
      ruleTypeRegistry: this.ruleTypeRegistry,
      alertingEventLogger: this.alertingEventLogger,
    });

    if (apm.currentTransaction) {
      apm.currentTransaction.name = `Execute Alerting Rule: "${rule.name}"`;
      apm.currentTransaction.addLabels({
        alerting_rule_consumer: rule.consumer,
        alerting_rule_name: rule.name,
        alerting_rule_tags: rule.tags.join(', '),
        alerting_rule_type_id: rule.alertTypeId,
        alerting_rule_params: JSON.stringify(rule.params),
      });
    }

    return {
      rulesClient: asOk(rulesClient),
      monitoring: asOk(rule.monitoring),
      stateWithMetrics: await promiseResult<RuleTaskStateAndMetrics, Error>(
        this.executeRule(fakeRequest, rulesClient, rule, apiKey, validatedParams, spaceId)
      ),
      schedule: asOk(
        // fetch the rule again to ensure we return the correct schedule as it may have
        // changed during the task execution
        (await rulesClient.get({ id: ruleId })).schedule
      ),
    };
  }

  private async markRuleAsSnoozed(id: string, rulesClient: RulesClientApi) {
    await rulesClient.updateSnoozedUntilTime({ id });
  }

  private async executeRule(
    fakeRequest: KibanaRequest,
    rulesClient: RulesClientApi,
    rule: SanitizedRule<Params>,
    apiKey: RawRule['apiKey'],
    params: Params,
    spaceId: string
  ): Promise<RuleTaskStateAndMetrics> {
    const {
      alertTypeId,
      consumer,
      schedule,
      throttle,
      name,
      tags,
      createdBy,
      updatedBy,
      createdAt,
      updatedAt,
      enabled,
      actions,
    } = rule;
    const {
      params: { alertId: ruleId },
      state: {
        alertInstances: alertRawInstances = {},
        alertTypeState: ruleTypeState = {},
        previousStartedAt,
      },
    } = this.taskInstance;

    const namespace = this.context.spaceIdToNamespace(spaceId);
    const ruleType = this.ruleTypeRegistry.get(alertTypeId);

    const alerts: Record<string, Alert<State, Context>> = {};
    for (const id in alertRawInstances) {
      if (alertRawInstances.hasOwnProperty(id)) {
        alerts[id] = new Alert<State, Context>(id, alertRawInstances[id]);
      }
    }
    const originalAlerts = cloneDeep(alerts);

    const ruleLabel = `${this.ruleType.id}:${ruleId}: '${name}'`;

    const wrappedClientOptions = {
      rule: {
        name: rule.name,
        alertTypeId: rule.alertTypeId,
        id: rule.id,
        spaceId,
      },
      logger: this.logger,
      abortController: this.searchAbortController,
    };
    const scopedClusterClient = this.context.elasticsearch.client.asScoped(fakeRequest);
    const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
      ...wrappedClientOptions,
      scopedClusterClient,
    });
    const searchSourceClient = await this.context.data.search.searchSource.asScoped(fakeRequest);
    const wrappedSearchSourceClient = wrapSearchSourceClient({
      ...wrappedClientOptions,
      searchSourceClient,
    });

    let updatedRuleTypeState: void | Record<string, unknown>;
    try {
      const ctx = {
        type: 'alert',
        name: `execute ${rule.alertTypeId}`,
        id: ruleId,
        description: `execute [${rule.alertTypeId}] with name [${name}] in [${
          namespace ?? 'default'
        }] namespace`,
      };

      const savedObjectsClient = this.context.savedObjects.getScopedClient(fakeRequest, {
        includedHiddenTypes: ['alert', 'action'],
      });

      updatedRuleTypeState = await this.context.executionContext.withContext(ctx, () =>
        this.ruleType.executor({
          alertId: ruleId,
          executionId: this.executionId,
          services: {
            savedObjectsClient,
            searchSourceClient: wrappedSearchSourceClient.searchSourceClient,
            uiSettingsClient: this.context.uiSettings.asScopedToClient(savedObjectsClient),
            scopedClusterClient: wrappedScopedClusterClient.client(),
            alertFactory: createAlertFactory<
              State,
              Context,
              WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
            >({
              alerts,
              logger: this.logger,
              canSetRecoveryContext: ruleType.doesSetRecoveryContext ?? false,
            }),
            shouldWriteAlerts: () => this.shouldLogAndScheduleActionsForAlerts(),
            shouldStopExecution: () => this.cancelled,
          },
          params,
          state: ruleTypeState as RuleState,
          startedAt: this.taskInstance.startedAt!,
          previousStartedAt: previousStartedAt ? new Date(previousStartedAt) : null,
          spaceId,
          namespace,
          name,
          tags,
          createdBy,
          updatedBy,
          rule: {
            name,
            tags,
            consumer,
            producer: ruleType.producer,
            ruleTypeId: rule.alertTypeId,
            ruleTypeName: ruleType.name,
            enabled,
            schedule,
            actions,
            createdBy,
            updatedBy,
            createdAt,
            updatedAt,
            throttle,
          },
        })
      );
    } catch (err) {
      this.alertingEventLogger.setExecutionFailed(
        `rule execution failure: ${ruleLabel}`,
        err.message
      );
      this.logger.error(err, {
        tags: [this.ruleType.id, ruleId, 'rule-run-failed'],
        error: { stack_trace: err.stack },
      });
      throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Execute, err);
    }

    this.alertingEventLogger.setExecutionSucceeded(`rule executed: ${ruleLabel}`);

    const scopedClusterClientMetrics = wrappedScopedClusterClient.getMetrics();
    const searchSourceClientMetrics = wrappedSearchSourceClient.getMetrics();
    const searchMetrics: SearchMetrics = {
      numSearches: scopedClusterClientMetrics.numSearches + searchSourceClientMetrics.numSearches,
      totalSearchDurationMs:
        scopedClusterClientMetrics.totalSearchDurationMs +
        searchSourceClientMetrics.totalSearchDurationMs,
      esSearchDurationMs:
        scopedClusterClientMetrics.esSearchDurationMs +
        searchSourceClientMetrics.esSearchDurationMs,
    };
    const ruleRunMetricsStore = new RuleRunMetricsStore();

    ruleRunMetricsStore.setNumSearches(searchMetrics.numSearches);
    ruleRunMetricsStore.setTotalSearchDurationMs(searchMetrics.totalSearchDurationMs);
    ruleRunMetricsStore.setEsSearchDurationMs(searchMetrics.esSearchDurationMs);

    const { newAlerts, ongoingAlerts, activeAlerts, recoveredAlerts } = processAlerts<
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >(alerts, originalAlerts);

    logActiveAndRecoveredAlerts({
      logger: this.logger,
      activeAlerts,
      recoveredAlerts,
      ruleLabel,
      canSetRecoveryContext: ruleType.doesSetRecoveryContext ?? false,
    });

    if (this.shouldLogAndScheduleActionsForAlerts()) {
      generateNewAndRecoveredAlertEvents({
        alertingEventLogger: this.alertingEventLogger,
        newAlerts,
        activeAlerts,
        recoveredAlerts,
        ruleLabel,
        ruleRunMetricsStore,
      });
    }

    await rulesClient.clearExpiredSnoozes({ id: rule.id });

    const ruleIsSnoozed = isRuleSnoozed(rule);
    if (ruleIsSnoozed) {
      await this.markRuleAsSnoozed(rule.id, rulesClient);
    }

    let actionsToReturn: Array<Omit<RuleAction, 'id'>> = [];

    if (!ruleIsSnoozed && this.shouldLogAndScheduleActionsForAlerts()) {
      const allAlerts = this.getExecutableAlerts({
        rule,
        alerts: [...Object.values(activeAlerts), ...Object.values(recoveredAlerts)],
      });

      /////////////////////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////////////////////

      const actionsToTrigger: RuleAction[] = [];
      const ruleTypeActionGroups = new Map(
        ruleType.actionGroups.map((group: ActionGroup<string>) => [group.id, group.name])
      );

      for (const action of rule.actions) {
        if (this.shouldActionBeThrottled(action)) {
          this.logger.info(
            `Action "${action.actionRef}" of "${ruleType.id}/${rule.name}" is throttled`
          );
          continue;
        }

        if (this.isActionDisabled(action)) {
          this.logger.warn(
            `Rule "${rule.id}" skipped scheduling action "${action.id}" because it is disabled`
          );
          continue;
        }

        if (action.isSummary && action.notifyWhen === NotifyWhen.ON_INTERVAL) {
          const actionParams = transformSummarizedActionParams({
            actionsPlugin: this.context.actionsPlugin,
            rule,
            alerts: {
              new: Object.values(newAlerts),
              ongoing: Object.values(ongoingAlerts),
              recovered: Object.values(recoveredAlerts),
            },
            action,
            ruleType: ruleType.id,
            spaceId,
            kibanaBaseUrl: this.context.kibanaBaseUrl,
          });

          actionsToTrigger.push({
            ...action,
            params: {
              ...injectActionParams({
                ruleId: rule.id,
                spaceId,
                actionParams,
                actionTypeId: action.actionTypeId,
              }),
            },
          });

          continue;
        }

        for (const alert of allAlerts) {
          const actionGroup = (
            alert.getState().end
              ? ruleType.recoveryActionGroup.id
              : alert.getScheduledActionOptions()!.actionGroup
          ) as RecoveryActionGroupId & ActionGroupIds;

          const actionSubgroup = alert.getScheduledActionOptions()?.subgroup;

          alert.updateLastScheduledActions(actionGroup, actionSubgroup);
          alert.unscheduleActions();

          if (action.group !== actionGroup) {
            if (!ruleTypeActionGroups.has(actionGroup)) {
              this.logger.error(`Invalid action group "${actionGroup}" for rule "${ruleType.id}".`);
              continue;
            }

            if (
              action.notifyWhen === NotifyWhen.ONCE &&
              !alert.scheduledActionGroupOrSubgroupHasChanged()
            ) {
              this.logger.debug(
                `skipping scheduling of actions for '${alert.getId()}' in rule ${ruleLabel}: alert is active but action group has not changed`
              );
              continue;
            }

            const actionParams = transformActionParams({
              actionsPlugin: this.context.actionsPlugin,
              rule,
              alert: alert as Alert<State, Context, ActionGroupIds>,
              action,
              ruleType: ruleType.id,
              spaceId,
              alertActionGroup: actionGroup,
              alertActionGroupName: ruleTypeActionGroups.get(actionGroup)! as string,
              alertActionSubgroup: actionSubgroup,
              kibanaBaseUrl: this.context.kibanaBaseUrl,
            });

            actionsToTrigger.push({
              ...action,
              params: {
                ...injectActionParams({
                  ruleId: rule.id,
                  spaceId,
                  actionParams,
                  actionTypeId: action.actionTypeId,
                }),
              },
            });

            if (alert.getState().end) {
              alert.scheduleActions(actionGroup);
            }

            this.alertingEventLogger.logAction({
              id: action.id,
              typeId: action.actionTypeId,
              alertId: alert.getId(),
              alertGroup: actionGroup,
              alertSubgroup: actionSubgroup,
            });
          }
        }
      }

      /////////////////////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////////////////////
      /////////////////////////////////////////////////////////////////////////

      actionsToReturn = (
        await this.triggerActions({
          actions: actionsToTrigger,
          spaceId,
          apiKey,
          ruleId,
          fakeRequest,
          ruleRunMetricsStore,
        })
      ).map((act) => omit(act, ['id']));
    } else {
      if (ruleIsSnoozed) {
        this.logger.debug(`no scheduling of actions for rule ${ruleLabel}: rule is snoozed.`);
      }
      if (!this.shouldLogAndScheduleActionsForAlerts()) {
        this.logger.debug(
          `no scheduling of actions for rule ${ruleLabel}: rule execution has been cancelled.`
        );
        // Usage counter for telemetry
        // This keeps track of how many times action executions were skipped after rule
        // execution completed successfully after the execution timeout
        // This can occur when rule executors do not short circuit execution in response
        // to timeout
        this.countUsageOfActionExecutionAfterRuleCancellation();
      }
    }

    const alertsToReturn: Record<string, RawAlertInstance> = {};

    for (const id in activeAlerts) {
      if (activeAlerts.hasOwnProperty(id)) {
        alertsToReturn[id] = activeAlerts[id].toRaw();
      }
    }

    return {
      metrics: ruleRunMetricsStore.getMetrics(),
      alertTypeState: updatedRuleTypeState || undefined,
      alertInstances: alertsToReturn,
      actions: actionsToReturn,
    };
  }

  private getExecutableAlerts({
    rule,
    alerts,
  }: {
    rule: SanitizedRule<RuleTypeParams>;
    alerts: Array<
      Alert<State, Context, ActionGroupIds> | Alert<State, Context, RecoveryActionGroupId>
    >;
  }): Array<Alert<State, Context, ActionGroupIds> | Alert<State, Context, RecoveryActionGroupId>> {
    return alerts.filter((alert) => {
      const muted = new Set(rule.mutedInstanceIds).has(alert.getId());
      let shouldExecuteAction = true;

      if (muted) {
        shouldExecuteAction = false;
        this.logger.debug(
          `skipping scheduling of actions for '${alert.getId()}' in rule ${
            rule.name
          }: rule is muted`
        );
      }

      return shouldExecuteAction;
    });
  }

  private async triggerActions({
    actions,
    spaceId,
    apiKey,
    ruleId,
    fakeRequest,
    ruleRunMetricsStore,
  }: {
    actions: RuleAction[];
    spaceId: string;
    apiKey: string | null;
    ruleId: string;
    fakeRequest: KibanaRequest;
    ruleRunMetricsStore: RuleRunMetricsStore;
  }): Promise<RuleAction[]> {
    const actionsClient = await this.context.actionsPlugin.getActionsClientWithRequest(fakeRequest);
    let ephemeralActionsToSchedule = this.context.maxEphemeralActionsPerRule;

    ruleRunMetricsStore.setNumberOfGeneratedActions(actions.length);

    const actionsToTrigger: RuleAction[] = [];

    for (const action of actions) {
      ruleRunMetricsStore.incrementNumberOfGeneratedActionsByConnectorType(action.actionTypeId);

      if (ruleRunMetricsStore.hasReachedTheExecutableActionsLimit(this.context.actionsConfigMap)) {
        ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
          actionTypeId: action.actionTypeId,
          status: ActionsCompletion.PARTIAL,
        });
        this.logger.debug(
          `Rule "${ruleId}" skipped scheduling action "${action.id}" because the maximum number of allowed actions has been reached.`
        );
        break;
      }

      if (
        ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType({
          actionTypeId: action.actionTypeId,
          actionsConfigMap: this.context.actionsConfigMap,
        })
      ) {
        if (!ruleRunMetricsStore.hasConnectorTypeReachedTheLimit(action.actionTypeId)) {
          this.logger.debug(
            `Rule "${ruleId}" skipped scheduling action "${action.id}" because the maximum number of allowed actions for connector type ${action.actionTypeId} has been reached.`
          );
        }
        ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
          actionTypeId: action.actionTypeId,
          status: ActionsCompletion.PARTIAL,
        });
        continue;
      }

      ruleRunMetricsStore.incrementNumberOfTriggeredActions();
      ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(action.actionTypeId);

      actionsToTrigger.push({ ...action, lastTriggerDate: new Date().toISOString() });
    }

    await Promise.all(
      actionsToTrigger.map(async (action) => {
        const enqueueOptions = {
          id: action.id,
          params: action.params,
          spaceId,
          apiKey: apiKey ?? null,
          consumer: this.ruleConsumer!,
          source: asSavedObjectExecutionSource({
            id: ruleId,
            type: 'alert',
          }),
          executionId: this.executionId,
          relatedSavedObjects: [
            {
              id: ruleId,
              type: 'alert',
              namespace: spaceId === 'default' ? undefined : spaceId,
              typeId: this.ruleType.id,
            },
          ],
        };

        if (this.context.supportsEphemeralTasks && ephemeralActionsToSchedule > 0) {
          ephemeralActionsToSchedule--;
          try {
            return actionsClient.ephemeralEnqueuedExecution(enqueueOptions);
          } catch (err) {
            if (isEphemeralTaskRejectedDueToCapacityError(err)) {
              return actionsClient.enqueueExecution(enqueueOptions);
            }
          }
        } else {
          return actionsClient.enqueueExecution(enqueueOptions);
        }
      })
    );

    return actionsToTrigger;
  }

  shouldActionBeThrottled(action: RuleAction) {
    return (
      action.notifyWhen === NotifyWhen.ON_INTERVAL &&
      action.lastTriggerDate &&
      // @ts-ignore
      moment(String(action.lastTriggerDate))
        .add(parseInt(String(action.actionThrottle), 10), action.actionThrottleUnit)
        .isAfter(moment())
    );
  }

  isActionDisabled(action: RuleAction) {
    return !this.context.actionsPlugin.isActionExecutable(action.id, action.actionTypeId, {
      notifyUsage: true,
    });
  }
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

function generateNewAndRecoveredAlertEvents<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  params: GenerateNewAndRecoveredAlertEventsParams<
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >
) {
  const { alertingEventLogger, activeAlerts, newAlerts, recoveredAlerts, ruleRunMetricsStore } =
    params;
  const activeAlertIds = Object.keys(activeAlerts);
  const recoveredAlertIds = Object.keys(recoveredAlerts);
  const newAlertIds = Object.keys(newAlerts);

  if (apm.currentTransaction) {
    apm.currentTransaction.addLabels({
      alerting_new_alerts: newAlertIds.length,
    });
  }

  ruleRunMetricsStore.setNumberOfActiveAlerts(activeAlertIds.length);
  ruleRunMetricsStore.setNumberOfNewAlerts(newAlertIds.length);
  ruleRunMetricsStore.setNumberOfRecoveredAlerts(recoveredAlertIds.length);

  for (const id of recoveredAlertIds) {
    const { group: actionGroup, subgroup: actionSubgroup } =
      recoveredAlerts[id].getLastScheduledActions() ?? {};
    const state = recoveredAlerts[id].getState();
    const message = `${params.ruleLabel} alert '${id}' has recovered`;

    alertingEventLogger.logAlert({
      action: EVENT_LOG_ACTIONS.recoveredInstance,
      id,
      group: actionGroup,
      subgroup: actionSubgroup,
      message,
      state,
    });
  }

  for (const id of newAlertIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      activeAlerts[id].getScheduledActionOptions() ?? {};
    const state = activeAlerts[id].getState();
    const message = `${params.ruleLabel} created new alert: '${id}'`;
    alertingEventLogger.logAlert({
      action: EVENT_LOG_ACTIONS.newInstance,
      id,
      group: actionGroup,
      subgroup: actionSubgroup,
      message,
      state,
    });
  }

  for (const id of activeAlertIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      activeAlerts[id].getScheduledActionOptions() ?? {};
    const state = activeAlerts[id].getState();
    const message = `${params.ruleLabel} active alert: '${id}' in ${
      actionSubgroup
        ? `actionGroup(subgroup): '${actionGroup}(${actionSubgroup})'`
        : `actionGroup: '${actionGroup}'`
    }`;
    alertingEventLogger.logAlert({
      action: EVENT_LOG_ACTIONS.activeInstance,
      id,
      group: actionGroup,
      subgroup: actionSubgroup,
      message,
      state,
    });
  }
}

function logActiveAndRecoveredAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  params: LogActiveAndRecoveredAlertsParams<State, Context, ActionGroupIds, RecoveryActionGroupId>
) {
  const { logger, activeAlerts, recoveredAlerts, ruleLabel, canSetRecoveryContext } = params;
  const activeAlertIds = Object.keys(activeAlerts);
  const recoveredAlertIds = Object.keys(recoveredAlerts);

  if (apm.currentTransaction) {
    apm.currentTransaction.addLabels({
      alerting_active_alerts: activeAlertIds.length,
      alerting_recovered_alerts: recoveredAlertIds.length,
    });
  }

  if (activeAlertIds.length > 0) {
    logger.debug(
      `rule ${ruleLabel} has ${activeAlertIds.length} active alerts: ${JSON.stringify(
        activeAlertIds.map((alertId) => ({
          instanceId: alertId,
          actionGroup: activeAlerts[alertId].getScheduledActionOptions()?.actionGroup,
        }))
      )}`
    );
  }
  if (recoveredAlertIds.length > 0) {
    logger.debug(
      `rule ${ruleLabel} has ${recoveredAlertIds.length} recovered alerts: ${JSON.stringify(
        recoveredAlertIds
      )}`
    );

    if (canSetRecoveryContext) {
      for (const id of recoveredAlertIds) {
        if (!recoveredAlerts[id].hasContext()) {
          logger.debug(
            `rule ${ruleLabel} has no recovery context specified for recovered alert ${id}`
          );
        }
      }
    }
  }
}

/**
 * If an error is thrown, wrap it in an RuleTaskRunResult
 * so that we can treat each field independantly
 */
async function errorAsRuleTaskRunResult(
  future: Promise<Resultable<RuleRunResult, Error>>
): Promise<Resultable<RuleRunResult, Error>> {
  try {
    return await future;
  } catch (e) {
    return {
      rulesClient: asErr(e),
      stateWithMetrics: asErr(e),
      schedule: asErr(e),
      monitoring: asErr(e),
    };
  }
}
