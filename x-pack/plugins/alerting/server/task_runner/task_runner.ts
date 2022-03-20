/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import { cloneDeep, mapValues, omit, pickBy, set, without } from 'lodash';
import type { Request } from '@hapi/hapi';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import uuid from 'uuid';
import { addSpaceIdToPath } from '../../../spaces/server';
import { KibanaRequest, Logger } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance, throwUnrecoverableError } from '../../../task_manager/server';
import { createExecutionHandler, ExecutionHandler } from './create_execution_handler';
import { Alert as CreatedAlert, createAlertFactory } from '../alert';
import {
  createWrappedScopedClusterClientFactory,
  ElasticsearchError,
  ErrorWithReason,
  executionStatusFromError,
  executionStatusFromState,
  getRecoveredAlerts,
  ruleExecutionStatusToRaw,
  validateRuleTypeParams,
} from '../lib';
import {
  Alert,
  AlertExecutionStatus,
  AlertExecutionStatusErrorReasons,
  IntervalSchedule,
  RawAlertInstance,
  RawRule,
  RawRuleExecutionStatus,
  RuleExecutionRunResult,
  RuleExecutionState,
  RuleMonitoring,
  RuleMonitoringHistory,
  RuleTaskState,
  RuleTypeRegistry,
  SanitizedAlert,
} from '../types';
import { asErr, asOk, map, promiseResult, resolveErr, Resultable } from '../lib/result_type';
import { getExecutionDurationPercentiles, getExecutionSuccessRatio } from '../lib/monitoring';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IEvent, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from '../lib/is_alerting_error';
import { partiallyUpdateAlert } from '../saved_objects';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
  MONITORING_HISTORY_LIMIT,
  parseDuration,
  WithoutReservedActionGroups,
} from '../../common';
import { NormalizedRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import { getEsErrorMessage } from '../lib/errors';
import {
  createAlertEventLogRecordObject,
  Event,
} from '../lib/create_alert_event_log_record_object';
import {
  ActionsCompletion,
  AlertExecutionStore,
  GenerateNewAndRecoveredAlertEventsParams,
  LogActiveAndRecoveredAlertsParams,
  RuleTaskInstance,
  RuleTaskRunResult,
  ScheduleActionsForRecoveredAlertsParams,
  TrackAlertDurationsParams,
} from './types';

const FALLBACK_RETRY_INTERVAL = '5m';
const CONNECTIVITY_RETRY_INTERVAL = '5m';

// 1,000,000 nanoseconds in 1 millisecond
const Millis2Nanos = 1000 * 1000;

export const getDefaultRuleMonitoring = (): RuleMonitoring => ({
  execution: {
    history: [],
    calculated_metrics: {
      success_ratio: 0,
    },
  },
});

export class TaskRunner<
  Params extends AlertTypeParams,
  ExtractedParams extends AlertTypeParams,
  State extends AlertTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: RuleTaskInstance;
  private ruleName: string | null;
  private ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  private readonly executionId: string;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private usageCounter?: UsageCounter;
  private searchAbortController: AbortController;
  private cancelled: boolean;

  constructor(
    ruleType: NormalizedRuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >,
    taskInstance: ConcreteTaskInstance,
    context: TaskRunnerContext
  ) {
    this.context = context;
    this.logger = context.logger;
    this.usageCounter = context.usageCounter;
    this.ruleType = ruleType;
    this.ruleName = null;
    this.taskInstance = taskInstanceToAlertTaskInstance(taskInstance);
    this.ruleTypeRegistry = context.ruleTypeRegistry;
    this.searchAbortController = new AbortController();
    this.cancelled = false;
    this.executionId = uuid.v4();
  }

  private async getDecryptedAttributes(
    ruleId: string,
    spaceId: string
  ): Promise<{ apiKey: string | null; enabled: boolean }> {
    const namespace = this.context.spaceIdToNamespace(spaceId);
    // Only fetch encrypted attributes here, we'll create a saved objects client
    // scoped with the API key to fetch the remaining data.
    const {
      attributes: { apiKey, enabled },
    } = await this.context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
      'alert',
      ruleId,
      { namespace }
    );

    return { apiKey, enabled };
  }

  private getFakeKibanaRequest(spaceId: string, apiKey: RawRule['apiKey']) {
    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    const path = addSpaceIdToPath('/', spaceId);

    const fakeRequest = KibanaRequest.from({
      headers: requestHeaders,
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    } as unknown as Request);

    this.context.basePathService.set(fakeRequest, path);

    return fakeRequest;
  }

  private getExecutionHandler(
    ruleId: string,
    ruleName: string,
    tags: string[] | undefined,
    spaceId: string,
    apiKey: RawRule['apiKey'],
    kibanaBaseUrl: string | undefined,
    actions: Alert<Params>['actions'],
    ruleParams: Params,
    request: KibanaRequest
  ) {
    return createExecutionHandler<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >({
      ruleId,
      ruleName,
      tags,
      executionId: this.executionId,
      logger: this.logger,
      actionsPlugin: this.context.actionsPlugin,
      apiKey,
      actions,
      spaceId,
      ruleType: this.ruleType,
      kibanaBaseUrl,
      eventLogger: this.context.eventLogger,
      request,
      ruleParams,
      supportsEphemeralTasks: this.context.supportsEphemeralTasks,
      maxEphemeralActionsPerRule: this.context.maxEphemeralActionsPerRule,
    });
  }

  private async updateRuleSavedObject(
    ruleId: string,
    namespace: string | undefined,
    attributes: { executionStatus?: RawRuleExecutionStatus; monitoring?: RuleMonitoring }
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

  private async executeAlert(
    alertId: string,
    alert: CreatedAlert<InstanceState, InstanceContext>,
    executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>,
    alertExecutionStore: AlertExecutionStore
  ) {
    const {
      actionGroup,
      subgroup: actionSubgroup,
      context,
      state,
    } = alert.getScheduledActionOptions()!;
    alert.updateLastScheduledActions(actionGroup, actionSubgroup);
    alert.unscheduleActions();
    return executionHandler({
      actionGroup,
      actionSubgroup,
      context,
      state,
      alertId,
      alertExecutionStore,
    });
  }

  private async executeAlerts(
    fakeRequest: KibanaRequest,
    rule: SanitizedAlert<Params>,
    params: Params,
    executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>,
    spaceId: string,
    event: Event
  ): Promise<RuleExecutionState> {
    const {
      alertTypeId,
      consumer,
      schedule,
      throttle,
      notifyWhen,
      muteAll,
      mutedInstanceIds,
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
      state: { alertInstances: alertRawInstances = {}, alertTypeState = {}, previousStartedAt },
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);
    const ruleType = this.ruleTypeRegistry.get(alertTypeId);

    const alerts = mapValues<
      Record<string, RawAlertInstance>,
      CreatedAlert<InstanceState, InstanceContext>
    >(
      alertRawInstances,
      (rawAlert, alertId) => new CreatedAlert<InstanceState, InstanceContext>(alertId, rawAlert)
    );

    const originalAlerts = cloneDeep(alerts);
    const originalAlertIds = new Set(Object.keys(originalAlerts));

    const eventLogger = this.context.eventLogger;
    const ruleLabel = `${this.ruleType.id}:${ruleId}: '${name}'`;

    const scopedClusterClient = this.context.elasticsearch.client.asScoped(fakeRequest);
    const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
      scopedClusterClient,
      rule: {
        name: rule.name,
        alertTypeId: rule.alertTypeId,
        id: rule.id,
        spaceId,
      },
      logger: this.logger,
      abortController: this.searchAbortController,
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
            uiSettingsClient: this.context.uiSettings.asScopedToClient(savedObjectsClient),
            scopedClusterClient: wrappedScopedClusterClient.client(),
            searchSourceClient: this.context.data.search.searchSource.asScoped(fakeRequest),
            alertFactory: createAlertFactory<
              InstanceState,
              InstanceContext,
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
          state: alertTypeState as State,
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
            notifyWhen,
          },
        })
      );
    } catch (err) {
      event.message = `rule execution failure: ${ruleLabel}`;
      event.error = event.error || {};
      event.error.message = err.message;
      event.event = event.event || {};
      event.event.outcome = 'failure';

      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Execute, err);
    }

    event.message = `rule executed: ${ruleLabel}`;
    event.event = event.event || {};
    event.event.outcome = 'success';
    event.rule = {
      ...event.rule,
      name: rule.name,
    };

    const searchMetrics = wrappedScopedClusterClient.getMetrics();

    // Cleanup alerts that are no longer scheduling actions to avoid over populating the alertInstances object
    const alertsWithScheduledActions = pickBy(
      alerts,
      (alert: CreatedAlert<InstanceState, InstanceContext>) => alert.hasScheduledActions()
    );

    const recoveredAlerts = getRecoveredAlerts(alerts, originalAlertIds);

    logActiveAndRecoveredAlerts({
      logger: this.logger,
      activeAlerts: alertsWithScheduledActions,
      recoveredAlerts,
      ruleLabel,
      canSetRecoveryContext: ruleType.doesSetRecoveryContext ?? false,
    });

    trackAlertDurations({
      originalAlerts,
      currentAlerts: alertsWithScheduledActions,
      recoveredAlerts,
    });

    if (this.shouldLogAndScheduleActionsForAlerts()) {
      generateNewAndRecoveredAlertEvents({
        eventLogger,
        executionId: this.executionId,
        originalAlerts,
        currentAlerts: alertsWithScheduledActions,
        recoveredAlerts,
        ruleId,
        ruleLabel,
        namespace,
        ruleType,
        rule,
      });
    }

    const alertExecutionStore: AlertExecutionStore = {
      numberOfTriggeredActions: 0,
      triggeredActionsStatus: ActionsCompletion.COMPLETE,
    };

    if (!muteAll && this.shouldLogAndScheduleActionsForAlerts()) {
      const mutedAlertIdsSet = new Set(mutedInstanceIds);

      const alertsWithExecutableActions = Object.entries(alertsWithScheduledActions).filter(
        ([alertName, alert]: [string, CreatedAlert<InstanceState, InstanceContext>]) => {
          const throttled = alert.isThrottled(throttle);
          const muted = mutedAlertIdsSet.has(alertName);
          let shouldExecuteAction = true;

          if (throttled || muted) {
            shouldExecuteAction = false;
            this.logger.debug(
              `skipping scheduling of actions for '${alertName}' in rule ${ruleLabel}: rule is ${
                muted ? 'muted' : 'throttled'
              }`
            );
          } else if (
            notifyWhen === 'onActionGroupChange' &&
            !alert.scheduledActionGroupOrSubgroupHasChanged()
          ) {
            shouldExecuteAction = false;
            this.logger.debug(
              `skipping scheduling of actions for '${alertName}' in rule ${ruleLabel}: alert is active but action group has not changed`
            );
          }

          return shouldExecuteAction;
        }
      );

      await Promise.all(
        alertsWithExecutableActions.map(
          ([alertId, alert]: [string, CreatedAlert<InstanceState, InstanceContext>]) =>
            this.executeAlert(alertId, alert, executionHandler, alertExecutionStore)
        )
      );

      await scheduleActionsForRecoveredAlerts<
        InstanceState,
        InstanceContext,
        RecoveryActionGroupId
      >({
        recoveryActionGroup: this.ruleType.recoveryActionGroup,
        recoveredAlerts,
        executionHandler,
        mutedAlertIdsSet,
        logger: this.logger,
        ruleLabel,
        alertExecutionStore,
      });
    } else {
      if (muteAll) {
        this.logger.debug(`no scheduling of actions for rule ${ruleLabel}: rule is muted.`);
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

    return {
      metrics: searchMetrics,
      alertExecutionStore,
      alertTypeState: updatedRuleTypeState || undefined,
      alertInstances: mapValues<
        Record<string, CreatedAlert<InstanceState, InstanceContext>>,
        RawAlertInstance
      >(alertsWithScheduledActions, (alert) => alert.toRaw()),
    };
  }

  private async validateAndExecuteRule(
    fakeRequest: KibanaRequest,
    apiKey: RawRule['apiKey'],
    rule: SanitizedAlert<Params>,
    event: Event
  ) {
    const {
      params: { alertId: ruleId, spaceId },
    } = this.taskInstance;

    // Validate
    const validatedParams = validateRuleTypeParams(rule.params, this.ruleType.validate?.params);
    const executionHandler = this.getExecutionHandler(
      ruleId,
      rule.name,
      rule.tags,
      spaceId,
      apiKey,
      this.context.kibanaBaseUrl,
      rule.actions,
      rule.params,
      fakeRequest
    );
    return this.executeAlerts(fakeRequest, rule, validatedParams, executionHandler, spaceId, event);
  }

  private async loadRuleAttributesAndRun(
    event: Event
  ): Promise<Resultable<RuleExecutionRunResult, Error>> {
    const {
      params: { alertId: ruleId, spaceId },
    } = this.taskInstance;
    let enabled: boolean;
    let apiKey: string | null;
    try {
      const decryptedAttributes = await this.getDecryptedAttributes(ruleId, spaceId);
      apiKey = decryptedAttributes.apiKey;
      enabled = decryptedAttributes.enabled;
    } catch (err) {
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Decrypt, err);
    }

    if (!enabled) {
      throw new ErrorWithReason(
        AlertExecutionStatusErrorReasons.Disabled,
        new Error(`Rule failed to execute because rule ran after it was disabled.`)
      );
    }

    const fakeRequest = this.getFakeKibanaRequest(spaceId, apiKey);

    // Get rules client with space level permissions
    const rulesClient = this.context.getRulesClientWithRequest(fakeRequest);

    let rule: SanitizedAlert<Params>;

    // Ensure API key is still valid and user has access
    try {
      rule = await rulesClient.get({ id: ruleId });

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
    } catch (err) {
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.Read, err);
    }

    this.ruleName = rule.name;

    try {
      this.ruleTypeRegistry.ensureRuleTypeEnabled(rule.alertTypeId);
    } catch (err) {
      throw new ErrorWithReason(AlertExecutionStatusErrorReasons.License, err);
    }

    if (rule.monitoring) {
      if (rule.monitoring.execution.history.length >= MONITORING_HISTORY_LIMIT) {
        // Remove the first (oldest) record
        rule.monitoring.execution.history.shift();
      }
    }
    return {
      monitoring: asOk(rule.monitoring),
      state: await promiseResult<RuleExecutionState, Error>(
        this.validateAndExecuteRule(fakeRequest, apiKey, rule, event)
      ),
      schedule: asOk(
        // fetch the rule again to ensure we return the correct schedule as it may have
        // changed during the task execution
        (await rulesClient.get({ id: ruleId })).schedule
      ),
    };
  }

  async run(): Promise<RuleTaskRunResult> {
    const {
      params: { alertId: ruleId, spaceId },
      startedAt,
      state: originalState,
      schedule: taskSchedule,
    } = this.taskInstance;

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
    const eventLogger = this.context.eventLogger;
    const scheduleDelay = runDate.getTime() - this.taskInstance.scheduledAt.getTime();

    const event = createAlertEventLogRecordObject({
      ruleId,
      ruleType: this.ruleType as UntypedNormalizedRuleType,
      action: EVENT_LOG_ACTIONS.execute,
      namespace,
      executionId: this.executionId,
      task: {
        scheduled: this.taskInstance.scheduledAt.toISOString(),
        scheduleDelay: Millis2Nanos * scheduleDelay,
      },
      savedObjects: [
        {
          id: ruleId,
          type: 'alert',
          typeId: this.ruleType.id,
          relation: SAVED_OBJECT_REL_PRIMARY,
        },
      ],
    });

    eventLogger.startTiming(event);

    const startEvent = cloneDeep({
      ...event,
      event: {
        ...event.event,
        action: EVENT_LOG_ACTIONS.executeStart,
      },
      message: `rule execution start: "${ruleId}"`,
    });
    eventLogger.logEvent(startEvent);

    const { state, schedule, monitoring } = await errorAsRuleTaskRunResult(
      this.loadRuleAttributesAndRun(event)
    );

    const ruleMonitoring =
      resolveErr<RuleMonitoring | undefined, Error>(monitoring, () => {
        return getDefaultRuleMonitoring();
      }) ?? getDefaultRuleMonitoring();

    const executionStatus = map<RuleExecutionState, ElasticsearchError, AlertExecutionStatus>(
      state,
      (ruleExecutionState) => executionStatusFromState(ruleExecutionState),
      (err: ElasticsearchError) => executionStatusFromError(err)
    );
    // set the executionStatus date to same as event, if it's set
    if (event.event?.start) {
      executionStatus.lastExecutionDate = new Date(event.event.start);
    }

    if (apm.currentTransaction) {
      if (executionStatus.status === 'ok' || executionStatus.status === 'active') {
        apm.currentTransaction.setOutcome('success');
      } else if (executionStatus.status === 'error' || executionStatus.status === 'unknown') {
        apm.currentTransaction.setOutcome('failure');
      }
    }

    this.logger.debug(
      `ruleExecutionStatus for ${this.ruleType.id}:${ruleId}: ${JSON.stringify(executionStatus)}`
    );

    eventLogger.stopTiming(event);
    set(event, 'kibana.alerting.status', executionStatus.status);

    const monitoringHistory: RuleMonitoringHistory = {
      success: true,
      timestamp: +new Date(),
    };

    // Copy duration into execution status if available
    if (null != event.event?.duration) {
      executionStatus.lastDuration = Math.round(event.event?.duration / Millis2Nanos);
      monitoringHistory.duration = executionStatus.lastDuration;
    }

    // if executionStatus indicates an error, fill in fields in
    // event from it
    if (executionStatus.error) {
      set(event, 'event.reason', executionStatus.error?.reason || 'unknown');
      set(event, 'event.outcome', 'failure');
      set(event, 'error.message', event?.error?.message || executionStatus.error.message);
      if (!event.message) {
        event.message = `${this.ruleType.id}:${ruleId}: execution failed`;
      }
      monitoringHistory.success = false;
    } else {
      if (executionStatus.warning) {
        set(event, 'event.reason', executionStatus.warning?.reason || 'unknown');
        set(event, 'message', event?.message || executionStatus.warning.message);
      }
      set(
        event,
        'kibana.alert.rule.execution.metrics.number_of_triggered_actions',
        executionStatus.numberOfTriggeredActions ?? 0
      );
    }

    // Copy search stats into event log
    if (executionStatus.metrics) {
      set(
        event,
        'kibana.alert.rule.execution.metrics.number_of_searches',
        executionStatus.metrics.numSearches ?? 0
      );
      set(
        event,
        'kibana.alert.rule.execution.metrics.es_search_duration_ms',
        executionStatus.metrics.esSearchDurationMs ?? 0
      );
      set(
        event,
        'kibana.alert.rule.execution.metrics.total_search_duration_ms',
        executionStatus.metrics.totalSearchDurationMs ?? 0
      );
    }

    ruleMonitoring.execution.history.push(monitoringHistory);
    ruleMonitoring.execution.calculated_metrics = {
      success_ratio: getExecutionSuccessRatio(ruleMonitoring),
      ...getExecutionDurationPercentiles(ruleMonitoring),
    };

    eventLogger.logEvent(event);

    if (!this.cancelled) {
      this.logger.debug(
        `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - ${JSON.stringify(
          executionStatus
        )}`
      );
      await this.updateRuleSavedObject(ruleId, namespace, {
        executionStatus: ruleExecutionStatusToRaw(executionStatus),
        monitoring: ruleMonitoring,
      });
    }

    const transformExecutionStateToTaskState = (
      executionState: RuleExecutionState
    ): RuleTaskState => {
      return {
        ...omit(executionState, ['alertExecutionStore', 'metrics']),
        previousStartedAt: startedAt,
      };
    };

    return {
      state: map<RuleExecutionState, ElasticsearchError, RuleTaskState>(
        state,
        (executionState: RuleExecutionState) => transformExecutionStateToTaskState(executionState),
        (err: ElasticsearchError) => {
          const message = `Executing Rule ${spaceId}:${
            this.ruleType.id
          }:${ruleId} has resulted in Error: ${getEsErrorMessage(err)}`;
          if (isAlertSavedObjectNotFoundError(err, ruleId)) {
            this.logger.debug(message);
          } else {
            this.logger.error(message);
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
      params: { alertId: ruleId, spaceId },
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);

    this.logger.debug(
      `Cancelling rule type ${this.ruleType.id} with id ${ruleId} - execution exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`
    );

    this.logger.debug(
      `Aborting any in-progress ES searches for rule type ${this.ruleType.id} with id ${ruleId}`
    );
    this.searchAbortController.abort();

    const eventLogger = this.context.eventLogger;
    const event: IEvent = {
      event: {
        action: EVENT_LOG_ACTIONS.executeTimeout,
        kind: 'alert',
        category: [this.ruleType.producer],
      },
      message: `rule: ${this.ruleType.id}:${ruleId}: '${
        this.ruleName ?? ''
      }' execution cancelled due to timeout - exceeded rule type timeout of ${
        this.ruleType.ruleTaskTimeout
      }`,
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: this.executionId,
            },
          },
        },
        saved_objects: [
          {
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: 'alert',
            id: ruleId,
            type_id: this.ruleType.id,
            namespace,
          },
        ],
      },
      rule: {
        id: ruleId,
        license: this.ruleType.minimumLicenseRequired,
        category: this.ruleType.id,
        ruleset: this.ruleType.producer,
        ...(this.ruleName ? { name: this.ruleName } : {}),
      },
    };
    eventLogger.logEvent(event);

    // Update the rule saved object with execution status
    const executionStatus: AlertExecutionStatus = {
      lastExecutionDate: new Date(),
      status: 'error',
      error: {
        reason: AlertExecutionStatusErrorReasons.Timeout,
        message: `${this.ruleType.id}:${ruleId}: execution cancelled due to timeout - exceeded rule type timeout of ${this.ruleType.ruleTaskTimeout}`,
      },
    };
    this.logger.debug(
      `Updating rule task for ${this.ruleType.id} rule with id ${ruleId} - execution error due to timeout`
    );
    await this.updateRuleSavedObject(ruleId, namespace, {
      executionStatus: ruleExecutionStatusToRaw(executionStatus),
    });
  }
}

function trackAlertDurations<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>(params: TrackAlertDurationsParams<InstanceState, InstanceContext>) {
  const currentTime = new Date().toISOString();
  const { currentAlerts, originalAlerts, recoveredAlerts } = params;
  const originalAlertIds = Object.keys(originalAlerts);
  const currentAlertIds = Object.keys(currentAlerts);
  const recoveredAlertIds = Object.keys(recoveredAlerts);
  const newAlertIds = without(currentAlertIds, ...originalAlertIds);

  // Inject start time into alert state of new alerts
  for (const id of newAlertIds) {
    const state = currentAlerts[id].getState();
    currentAlerts[id].replaceState({ ...state, start: currentTime });
  }

  // Calculate duration to date for active alerts
  for (const id of currentAlertIds) {
    const state = originalAlertIds.includes(id)
      ? originalAlerts[id].getState()
      : currentAlerts[id].getState();
    const duration = state.start
      ? (new Date(currentTime).valueOf() - new Date(state.start as string).valueOf()) * 1000 * 1000 // nanoseconds
      : undefined;
    currentAlerts[id].replaceState({
      ...state,
      ...(state.start ? { start: state.start } : {}),
      ...(duration !== undefined ? { duration } : {}),
    });
  }

  // Inject end time into alert state of recovered alerts
  for (const id of recoveredAlertIds) {
    const state = recoveredAlerts[id].getState();
    const duration = state.start
      ? (new Date(currentTime).valueOf() - new Date(state.start as string).valueOf()) * 1000 * 1000 // nanoseconds
      : undefined;
    recoveredAlerts[id].replaceState({
      ...state,
      ...(duration ? { duration } : {}),
      ...(state.start ? { end: currentTime } : {}),
    });
  }
}

function generateNewAndRecoveredAlertEvents<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>(params: GenerateNewAndRecoveredAlertEventsParams<InstanceState, InstanceContext>) {
  const {
    eventLogger,
    executionId,
    ruleId,
    namespace,
    currentAlerts,
    originalAlerts,
    recoveredAlerts,
    rule,
    ruleType,
  } = params;
  const originalAlertIds = Object.keys(originalAlerts);
  const currentAlertIds = Object.keys(currentAlerts);
  const recoveredAlertIds = Object.keys(recoveredAlerts);
  const newIds = without(currentAlertIds, ...originalAlertIds);

  if (apm.currentTransaction) {
    apm.currentTransaction.addLabels({
      alerting_new_alerts: newIds.length,
    });
  }

  for (const id of recoveredAlertIds) {
    const { group: actionGroup, subgroup: actionSubgroup } =
      recoveredAlerts[id].getLastScheduledActions() ?? {};
    const state = recoveredAlerts[id].getState();
    const message = `${params.ruleLabel} alert '${id}' has recovered`;
    logAlertEvent(
      id,
      EVENT_LOG_ACTIONS.recoveredInstance,
      message,
      state,
      actionGroup,
      actionSubgroup
    );
  }

  for (const id of newIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      currentAlerts[id].getScheduledActionOptions() ?? {};
    const state = currentAlerts[id].getState();
    const message = `${params.ruleLabel} created new alert: '${id}'`;
    logAlertEvent(id, EVENT_LOG_ACTIONS.newInstance, message, state, actionGroup, actionSubgroup);
  }

  for (const id of currentAlertIds) {
    const { actionGroup, subgroup: actionSubgroup } =
      currentAlerts[id].getScheduledActionOptions() ?? {};
    const state = currentAlerts[id].getState();
    const message = `${params.ruleLabel} active alert: '${id}' in ${
      actionSubgroup
        ? `actionGroup(subgroup): '${actionGroup}(${actionSubgroup})'`
        : `actionGroup: '${actionGroup}'`
    }`;
    logAlertEvent(
      id,
      EVENT_LOG_ACTIONS.activeInstance,
      message,
      state,
      actionGroup,
      actionSubgroup
    );
  }

  function logAlertEvent(
    alertId: string,
    action: string,
    message: string,
    state: InstanceState,
    group?: string,
    subgroup?: string
  ) {
    const event: IEvent = {
      event: {
        action,
        kind: 'alert',
        category: [ruleType.producer],
        ...(state?.start ? { start: state.start as string } : {}),
        ...(state?.end ? { end: state.end as string } : {}),
        ...(state?.duration !== undefined ? { duration: state.duration as number } : {}),
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: executionId,
            },
          },
        },
        alerting: {
          instance_id: alertId,
          ...(group ? { action_group_id: group } : {}),
          ...(subgroup ? { action_subgroup: subgroup } : {}),
        },
        saved_objects: [
          {
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: 'alert',
            id: ruleId,
            type_id: ruleType.id,
            namespace,
          },
        ],
      },
      message,
      rule: {
        id: rule.id,
        license: ruleType.minimumLicenseRequired,
        category: ruleType.id,
        ruleset: ruleType.producer,
        name: rule.name,
      },
    };
    eventLogger.logEvent(event);
  }
}

async function scheduleActionsForRecoveredAlerts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  params: ScheduleActionsForRecoveredAlertsParams<
    InstanceState,
    InstanceContext,
    RecoveryActionGroupId
  >
): Promise<void> {
  const {
    logger,
    recoveryActionGroup,
    recoveredAlerts,
    executionHandler,
    mutedAlertIdsSet,
    ruleLabel,
    alertExecutionStore,
  } = params;
  const recoveredIds = Object.keys(recoveredAlerts);

  for (const id of recoveredIds) {
    if (mutedAlertIdsSet.has(id)) {
      logger.debug(
        `skipping scheduling of actions for '${id}' in rule ${ruleLabel}: instance is muted`
      );
    } else {
      const alert = recoveredAlerts[id];
      alert.updateLastScheduledActions(recoveryActionGroup.id);
      alert.unscheduleActions();
      await executionHandler({
        actionGroup: recoveryActionGroup.id,
        context: alert.getContext(),
        state: {},
        alertId: id,
        alertExecutionStore,
      });
      alert.scheduleActions(recoveryActionGroup.id);
    }
  }
}

function logActiveAndRecoveredAlerts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  params: LogActiveAndRecoveredAlertsParams<
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >
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
  future: Promise<Resultable<RuleExecutionRunResult, Error>>
): Promise<Resultable<RuleExecutionRunResult, Error>> {
  try {
    return await future;
  } catch (e) {
    return {
      state: asErr(e),
      schedule: asErr(e),
      monitoring: asErr(e),
    };
  }
}
