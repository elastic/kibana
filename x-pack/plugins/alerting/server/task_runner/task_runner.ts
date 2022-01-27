/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Dictionary, pickBy, mapValues, without, cloneDeep } from 'lodash';
import type { Request } from '@hapi/hapi';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import uuid from 'uuid';
import { addSpaceIdToPath } from '../../../spaces/server';
import { Logger, KibanaRequest } from '../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance, throwUnrecoverableError } from '../../../task_manager/server';
import { createExecutionHandler, ExecutionHandler } from './create_execution_handler';
import { AlertInstance, createAlertInstanceFactory } from '../alert_instance';
import {
  validateRuleTypeParams,
  executionStatusFromState,
  executionStatusFromError,
  ruleExecutionStatusToRaw,
  ErrorWithReason,
  ElasticsearchError,
} from '../lib';
import {
  RawRule,
  IntervalSchedule,
  Services,
  RawAlertInstance,
  RuleTaskState,
  Alert,
  SanitizedAlert,
  AlertExecutionStatus,
  AlertExecutionStatusErrorReasons,
  RuleTypeRegistry,
  RuleMonitoring,
  RawRuleExecutionStatus,
} from '../types';
import { promiseResult, map, Resultable, asOk, asErr, resolveErr } from '../lib/result_type';
import { taskInstanceToAlertTaskInstance } from './alert_task_instance';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IEvent, IEventLogger, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from '../lib/is_alerting_error';
import { RulesClient } from '../rules_client';
import { partiallyUpdateAlert } from '../saved_objects';
import {
  ActionGroup,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  WithoutReservedActionGroups,
  parseDuration,
} from '../../common';
import { NormalizedRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import { getEsErrorMessage } from '../lib/errors';
import {
  createAlertEventLogRecordObject,
  Event,
} from '../lib/create_alert_event_log_record_object';
import { createAbortableEsClientFactory } from '../lib/create_abortable_es_client_factory';

const FALLBACK_RETRY_INTERVAL = '5m';
const CONNECTIVITY_RETRY_INTERVAL = '5m';
const MONITORING_HISTORY_LIMIT = 200;

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

interface RuleTaskRunResult {
  state: RuleTaskState;
  monitoring: RuleMonitoring | undefined;
  schedule: IntervalSchedule | undefined;
}

interface RuleTaskInstance extends ConcreteTaskInstance {
  state: RuleTaskState;
}

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

  async getDecryptedAttributes(
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

  private getServicesWithSpaceLevelPermissions(
    spaceId: string,
    apiKey: RawRule['apiKey']
  ): [Services, PublicMethodsOf<RulesClient>] {
    const request = this.getFakeKibanaRequest(spaceId, apiKey);
    return [this.context.getServices(request), this.context.getRulesClientWithRequest(request)];
  }

  private getExecutionHandler(
    ruleId: string,
    ruleName: string,
    tags: string[] | undefined,
    spaceId: string,
    apiKey: RawRule['apiKey'],
    kibanaBaseUrl: string | undefined,
    actions: Alert<Params>['actions'],
    ruleParams: Params
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
      request: this.getFakeKibanaRequest(spaceId, apiKey),
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

  async executeAlert(
    alertId: string,
    alert: AlertInstance<InstanceState, InstanceContext>,
    executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>
  ) {
    const {
      actionGroup,
      subgroup: actionSubgroup,
      context,
      state,
    } = alert.getScheduledActionOptions()!;
    alert.updateLastScheduledActions(actionGroup, actionSubgroup);
    alert.unscheduleActions();
    return executionHandler({ actionGroup, actionSubgroup, context, state, alertId });
  }

  async executeAlerts(
    services: Services,
    rule: SanitizedAlert<Params>,
    params: Params,
    executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>,
    spaceId: string,
    event: Event
  ): Promise<RuleTaskState> {
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
      AlertInstance<InstanceState, InstanceContext>
    >(alertRawInstances, (rawAlert) => new AlertInstance<InstanceState, InstanceContext>(rawAlert));
    const originalAlerts = cloneDeep(alerts);
    const originalAlertIds = new Set(Object.keys(originalAlerts));

    const eventLogger = this.context.eventLogger;
    const ruleLabel = `${this.ruleType.id}:${ruleId}: '${name}'`;

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

      updatedRuleTypeState = await this.context.executionContext.withContext(ctx, () =>
        this.ruleType.executor({
          alertId: ruleId,
          executionId: this.executionId,
          services: {
            ...services,
            alertInstanceFactory: createAlertInstanceFactory<
              InstanceState,
              InstanceContext,
              WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
            >(alerts),
            shouldWriteAlerts: () => this.shouldLogAndScheduleActionsForAlerts(),
            shouldStopExecution: () => this.cancelled,
            search: createAbortableEsClientFactory({
              scopedClusterClient: services.scopedClusterClient,
              abortController: this.searchAbortController,
            }),
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

    // Cleanup alerts that are no longer scheduling actions to avoid over populating the alertInstances object
    const alertsWithScheduledActions = pickBy(
      alerts,
      (alert: AlertInstance<InstanceState, InstanceContext>) => alert.hasScheduledActions()
    );
    const recoveredAlerts = pickBy(
      alerts,
      (alert: AlertInstance<InstanceState, InstanceContext>, id) =>
        !alert.hasScheduledActions() && originalAlertIds.has(id)
    );

    logActiveAndRecoveredAlerts({
      logger: this.logger,
      activeAlerts: alertsWithScheduledActions,
      recoveredAlerts,
      ruleLabel,
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

    if (!muteAll && this.shouldLogAndScheduleActionsForAlerts()) {
      const mutedAlertIdsSet = new Set(mutedInstanceIds);

      scheduleActionsForRecoveredAlerts<InstanceState, InstanceContext, RecoveryActionGroupId>({
        recoveryActionGroup: this.ruleType.recoveryActionGroup,
        recoveredAlerts,
        executionHandler,
        mutedAlertIdsSet,
        logger: this.logger,
        ruleLabel,
      });

      const alertsToExecute =
        notifyWhen === 'onActionGroupChange'
          ? Object.entries(alertsWithScheduledActions).filter(
              ([alertName, alert]: [string, AlertInstance<InstanceState, InstanceContext>]) => {
                const shouldExecuteAction = alert.scheduledActionGroupOrSubgroupHasChanged();
                if (!shouldExecuteAction) {
                  this.logger.debug(
                    `skipping scheduling of actions for '${alertName}' in rule ${ruleLabel}: alert is active but action group has not changed`
                  );
                }
                return shouldExecuteAction;
              }
            )
          : Object.entries(alertsWithScheduledActions).filter(
              ([alertName, alert]: [string, AlertInstance<InstanceState, InstanceContext>]) => {
                const throttled = alert.isThrottled(throttle);
                const muted = mutedAlertIdsSet.has(alertName);
                const shouldExecuteAction = !throttled && !muted;
                if (!shouldExecuteAction) {
                  this.logger.debug(
                    `skipping scheduling of actions for '${alertName}' in rule ${ruleLabel}: rule is ${
                      muted ? 'muted' : 'throttled'
                    }`
                  );
                }
                return shouldExecuteAction;
              }
            );

      await Promise.all(
        alertsToExecute.map(
          ([alertId, alert]: [string, AlertInstance<InstanceState, InstanceContext>]) =>
            this.executeAlert(alertId, alert, executionHandler)
        )
      );
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
      alertTypeState: updatedRuleTypeState || undefined,
      alertInstances: mapValues<
        Record<string, AlertInstance<InstanceState, InstanceContext>>,
        RawAlertInstance
      >(alertsWithScheduledActions, (alert) => alert.toRaw()),
    };
  }

  async validateAndExecuteRule(
    services: Services,
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
      rule.params
    );
    return this.executeAlerts(services, rule, validatedParams, executionHandler, spaceId, event);
  }

  async loadRuleAttributesAndRun(event: Event): Promise<Resultable<RuleTaskRunResult, Error>> {
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

    const [services, rulesClient] = this.getServicesWithSpaceLevelPermissions(spaceId, apiKey);

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
      state: await promiseResult<RuleTaskState, Error>(
        this.validateAndExecuteRule(services, apiKey, rule, event)
      ),
      schedule: asOk(
        // fetch the rule again to ensure we return the correct schedule as it may have
        // cahnged during the task execution
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
    const scheduleDelay = runDate.getTime() - this.taskInstance.runAt.getTime();

    const event = createAlertEventLogRecordObject({
      ruleId,
      ruleType: this.ruleType as UntypedNormalizedRuleType,
      action: EVENT_LOG_ACTIONS.execute,
      namespace,
      executionId: this.executionId,
      task: {
        scheduled: this.taskInstance.runAt.toISOString(),
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
    const executionStatus: AlertExecutionStatus = map(
      state,
      (ruleTaskState: RuleTaskState) => executionStatusFromState(ruleTaskState),
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
    event.kibana = event.kibana || {};
    event.kibana.alerting = event.kibana.alerting || {};
    event.kibana.alerting.status = executionStatus.status;

    // Copy duration into execution status if available
    if (null != event.event?.duration) {
      executionStatus.lastDuration = Math.round(event.event?.duration / Millis2Nanos);
    }

    const monitoringHistory = {
      success: true,
      timestamp: +new Date(),
    };
    // if executionStatus indicates an error, fill in fields in
    // event from it
    if (executionStatus.error) {
      event.event = event.event || {};
      event.event.reason = executionStatus.error?.reason || 'unknown';
      event.event.outcome = 'failure';
      event.error = event.error || {};
      event.error.message = event.error.message || executionStatus.error.message;
      if (!event.message) {
        event.message = `${this.ruleType.id}:${ruleId}: execution failed`;
      }
      monitoringHistory.success = false;
    }

    ruleMonitoring.execution.history.push(monitoringHistory);
    ruleMonitoring.execution.calculated_metrics.success_ratio =
      ruleMonitoring.execution.history.filter(({ success }) => success).length /
      ruleMonitoring.execution.history.length;
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

    return {
      state: map<RuleTaskState, ElasticsearchError, RuleTaskState>(
        state,
        (stateUpdates: RuleTaskState) => {
          return {
            ...stateUpdates,
            previousStartedAt: startedAt,
          };
        },
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

interface TrackAlertDurationsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  originalAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  currentAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  recoveredAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
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

interface GenerateNewAndRecoveredAlertEventsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  eventLogger: IEventLogger;
  executionId: string;
  originalAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  currentAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  recoveredAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext>>;
  ruleId: string;
  ruleLabel: string;
  namespace: string | undefined;
  ruleType: NormalizedRuleType<
    AlertTypeParams,
    AlertTypeParams,
    AlertTypeState,
    {
      [x: string]: unknown;
    },
    {
      [x: string]: unknown;
    },
    string,
    string
  >;
  rule: SanitizedAlert<AlertTypeParams>;
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

interface ScheduleActionsForRecoveredAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  recoveredAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  executionHandler: ExecutionHandler<RecoveryActionGroupId | RecoveryActionGroupId>;
  mutedAlertIdsSet: Set<string>;
  ruleLabel: string;
}

function scheduleActionsForRecoveredAlerts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  params: ScheduleActionsForRecoveredAlertsParams<
    InstanceState,
    InstanceContext,
    RecoveryActionGroupId
  >
) {
  const {
    logger,
    recoveryActionGroup,
    recoveredAlerts,
    executionHandler,
    mutedAlertIdsSet,
    ruleLabel,
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
      executionHandler({
        actionGroup: recoveryActionGroup.id,
        context: {},
        state: {},
        alertId: id,
      });
      alert.scheduleActions(recoveryActionGroup.id);
    }
  }
}

interface LogActiveAndRecoveredAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  activeAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext, ActionGroupIds>>;
  recoveredAlerts: Dictionary<AlertInstance<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  ruleLabel: string;
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
  const { logger, activeAlerts, recoveredAlerts, ruleLabel } = params;
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
  }
}

/**
 * If an error is thrown, wrap it in an RuleTaskRunResult
 * so that we can treat each field independantly
 */
async function errorAsRuleTaskRunResult(
  future: Promise<Resultable<RuleTaskRunResult, Error>>
): Promise<Resultable<RuleTaskRunResult, Error>> {
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
