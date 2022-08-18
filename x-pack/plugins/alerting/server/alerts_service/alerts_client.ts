/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { millisToNanos } from '@kbn/event-log-plugin/server';
import { cloneDeep } from 'lodash';
import uuid from 'uuid';
import { parseDuration } from '../lib';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  IAlertsClient,
  PublicAlertsClient,
  DEFAULT_ALERTS_INDEX,
  LoadExistingAlertsParams,
  AlertSchema,
  CreateAlertSchema,
  AlertRuleSchema,
  WriteAlertParams,
  ScheduleActionsParams,
} from './types';

interface AlertsClientParams {
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  maxAlerts: number;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}
export class AlertsClient implements IAlertsClient {
  private rule: AlertRuleSchema | null = null;

  private hasCalledGetRecoveredAlerts: boolean = false;
  private reachedAlertLimit: boolean = false;

  // Alerts from the previous rule execution
  // TODO - Alerts can be large, should we strip these down to the bare minimum
  // required by the framework? But since they now contain state values previously
  // stored in task document, do we need to keep the values in case the rules need them?
  private existingAlerts: AlertSchema[] = [];

  // Alerts created during the current rule execution
  private createdAlerts: AlertSchema[] = [];

  // Alerts ready to be written
  private preparedAlerts: AlertSchema[] = [];

  // Alerts with partial updates during the current rule execution
  //
  private updatedAlerts: Array<Partial<AlertSchema>> = [];

  constructor(private readonly options: AlertsClientParams) {}

  public setRuleData(rule: AlertRuleSchema) {
    this.rule = rule;
  }

  public hasReachedAlertLimit() {
    return this.reachedAlertLimit;
  }

  public async loadExistingAlerts({
    ruleId,
    previousRuleExecutionUuid,
    alertsIndex,
  }: LoadExistingAlertsParams): Promise<void> {
    this.options.logger.info(
      `loadExistingAlerts rule id ${ruleId}, execution ${previousRuleExecutionUuid}`
    );
    const esClient = await this.options.elasticsearchClientPromise;
    const indexToQuery = alertsIndex ?? DEFAULT_ALERTS_INDEX;

    try {
      // TODO - should iterate query to make sure we get all the alerts
      // if the total is above the size param
      const {
        hits: { hits, total },
      } = await esClient.search<AlertSchema>({
        index: indexToQuery,
        track_total_hits: true,
        body: {
          size: 1000,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    // Using .keyword because index mapping is set to dynamic = true
                    // so rule.id is auto-mapped as text. Update when we're using an actual
                    // index mapping
                    'rule.id.keyword': ruleId,
                  },
                },
                {
                  term: {
                    // Using .keyword because index mapping is set to dynamic = true
                    // so rule.id is auto-mapped as text. Update when we're using an actual
                    // index mapping
                    'rule.execution.id.keyword': previousRuleExecutionUuid,
                  },
                },
              ],
            },
          },
        },
      });

      this.existingAlerts = hits.map((hit) => hit._source);
    } catch (err) {
      this.options.logger.error(
        `Error searching for alerts from previous execution - ${err.message}`
      );
    }
  }

  public create(alert: CreateAlertSchema) {
    if (this.options.ruleType.useLegacyAlerts) {
      throw new Error(
        `Can't create alert in AlertsClient because rule type is using legacy alerts`
      );
    }

    if (this.hasCalledGetRecoveredAlerts) {
      throw new Error(`Can't create new alerts after calling getRecoveredAlerts()!`);
    }

    if (this.createdAlerts.find((a) => a.id === alert.id)) {
      throw new Error(`Can't create alert multiple times!`);
    }

    if (this.createdAlerts.length + 1 >= this.options.maxAlerts) {
      this.reachedAlertLimit = true;
      throw new Error(`Can't create new alerts as max allowed alerts have been created!`);
    }

    // Fill in rule information
    this.createdAlerts.push({
      ...alert,
      status: 'active',
      rule: this.rule,
      '@timestamp': new Date().toISOString(),
    });
  }

  public getExistingAlerts(): AlertSchema[] {
    return cloneDeep(this.existingAlerts);
  }

  public getRecoveredAlerts(): AlertSchema[] {
    this.hasCalledGetRecoveredAlerts = true;
    if (this.options.ruleType.autoRecoverAlerts || !this.options.ruleType.doesSetRecoveryContext) {
      this.options.logger.debug(
        `Set doesSetRecoveryContext and autoRecoverAlerts to true on rule type to get access to recovered alerts.`
      );
      return [];
    }
    return [];
  }

  public update(id: string, updatedAlert: Partial<AlertSchema>) {
    // Make sure we're updating something that exists
    const existingAlert = this.existingAlerts.find(({ id: alertId }) => id === alertId);
    if (existingAlert) {
      // Make sure we're not allowing updates to fields that shouldn't be updated
      // by the rule type
      const {
        id: alertId,
        uuid: alertUuid,
        status,
        start,
        duration,
        end,
        actionGroup,
        actionSubGroup,
        rule,
        ...restAlert
      } = updatedAlert;

      this.updatedAlerts.push({
        ...existingAlert,
        ...restAlert,
        '@timestamp': new Date().toISOString(),
      });
    } else {
      this.options.logger.warn(`trying to update alert with ${id} which does not exist`);
      // need to throw error?
    }
  }

  public async writeAlerts(params?: WriteAlertParams) {
    this.options.logger.info(`writeAlerts`);
    this.options.logger.info(`${this.existingAlerts.length} existing alerts`);
    this.options.logger.info(`${this.createdAlerts.length} created alerts`);
    // Update alert with status and prepare for writing
    // TODO - Lifecycle alerts set some other fields based on alert status
    // Do we need to move those to the framework? Otherwise we would need to
    // allow rule types to set these fields but they won't know the status
    // of the alert beforehand
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'
    this.prepareAlerts(this.options.ruleType.autoRecoverAlerts ?? true);

    this.options.logger.info(`preparedAlerts ${JSON.stringify(this.preparedAlerts)}`);

    // Bulk index alerts
    const esClient = await this.options.elasticsearchClientPromise;
    await esClient.bulk({
      body: this.preparedAlerts.flatMap((alert) => [
        { index: { _id: alert.uuid, _index: DEFAULT_ALERTS_INDEX, require_alias: false } },
        alert,
      ]),
    });

    if (params) {
      this.logAlerts(params.eventLogger, params.metricsStore);
    }
  }

  // TODO
  public scheduleActions(params: ScheduleActionsParams) {
    const { metricsStore, throttle, notifyWhen, mutedAlertIds } = params;
    // const throttleMills = throttle ? parseDuration(throttle) : 0;

    // for (const alert of this.preparedAlerts) {
    //   let executeAction = true;
    //   const muted = mutedAlertIds.has(alert.id);

    //   // TODO - would need to recreate the logic for determining throttling
    //   // including whether the action group changed
    //   const throttled = false;

    //   if (throttled || muted) {
    //     executeAction = false;
    //     this.options.logger.debug(
    //       `skipping scheduling of actions for '${alert.id}' in rule ${this.options.ruleType.id}:${
    //         this.rule?.id
    //       }: '${this.rule?.name}': rule is ${muted ? 'muted' : 'throttled'}`
    //     );
    //   } else if (
    //     notifyWhen === 'onActionGroupChange' /* &&
    //     !alert.scheduledActionGroupOrSubgroupHasChanged()*/
    //   ) {
    //     executeAction = false;
    //     this.options.logger.debug(
    //       `skipping scheduling of actions for '${alert.id}' in rule ${this.options.ruleType.id}:${this.rule?.id}: '${this.rule?.name}': alert is active but action group has not changed`
    //     );
    //   }

    //   if (executeAction /* && alert.hasScheduledActions()*/) {

    //   }
    // }
  }

  public getExecutorServices(): PublicAlertsClient {
    return {
      create: (...args) => this.create(...args),
      update: (...args) => this.update(...args),
      getExistingAlerts: () => this.getExistingAlerts(),
      getRecoveredAlerts: () => this.getRecoveredAlerts(),
    };
  }

  private prepareAlerts(shouldRecover: boolean) {
    const currentTime = new Date().toISOString();

    // Active alerts
    for (const alert of this.createdAlerts) {
      // Look for this alert in existing alerts
      const existingAlert = this.existingAlerts.find(({ id }) => id === alert.id);
      if (existingAlert) {
        // Copy over start time and uuid and update duration
        const durationInMs =
          new Date(currentTime).valueOf() - new Date(existingAlert.start as string).valueOf();
        const duration = existingAlert.start ? millisToNanos(durationInMs) : undefined;
        this.preparedAlerts.push({
          ...alert,
          ...(existingAlert.start ? { start: existingAlert.start } : {}),
          ...(duration !== undefined ? { duration } : {}),
          ...(existingAlert.uuid ? { uuid: existingAlert.uuid } : {}),
          action: 'active',
        });
      } else {
        // Add current time as start time, seed duration with '0' and generate uuid
        this.preparedAlerts.push({
          ...alert,
          start: currentTime,
          duration: '0',
          uuid: uuid.v4(),

          // adding these because lifecycle executor adds these
          workflowStatus: 'open',
          action: 'new',
        });
      }
    }

    if (this.createdAlerts.length > 0) {
      this.options.logger.debug(
        `rule ${this.options.ruleType.id}:${this.rule?.id}: '${this.rule?.name}' has ${
          this.createdAlerts.length
        } active alerts: ${JSON.stringify(
          this.createdAlerts.map(({ id, actionGroup }) => ({
            instanceId: id,
            actionGroup,
          }))
        )}`
      );
    }

    // Recovered alerts
    if (shouldRecover) {
      this.options.logger.info('calculating recovery alerts');
      const recoveredAlerts = this.existingAlerts.filter(
        ({ id: id1 }) => !this.createdAlerts.some(({ id: id2 }) => id2 === id1)
      );

      if (recoveredAlerts.length > 0) {
        this.options.logger.debug(
          `rule ${this.options.ruleType.id}:${this.rule?.id}: '${this.rule?.name}' has ${
            recoveredAlerts.length
          } recovered alerts: ${JSON.stringify(
            recoveredAlerts.map(({ id }) => ({ instanceId: id }))
          )}`
        );
      }

      this.options.logger.info(`recoveredAlerts ${recoveredAlerts.length}`);

      for (const alert of recoveredAlerts) {
        // Look for updates to this alert
        const updatedAlert = this.updatedAlerts.find(({ id }) => id === alert.id);
        if (updatedAlert) {
          this.preparedAlerts.push({
            ...alert,
            ...updatedAlert,
            actionGroup: this.options.ruleType.recoveryActionGroup.id,
            status: 'recovered',
            end: currentTime,
            action: 'recovered',
          });
        } else {
          // TODO - This alert has recovered but there are no updates to it
          // What should we do here?
          //  - 1. Strip out previous information and write it with the bare minimum of information?
          //  - 2. Persist information from previous run? This could include context and state
          //         fields that might not be relevant anymore
          this.preparedAlerts.push({
            ...alert,
            actionGroup: this.options.ruleType.recoveryActionGroup.id,
            status: 'recovered',
            end: currentTime,
            action: 'recovered',
          });

          if (this.options.ruleType.doesSetRecoveryContext) {
            this.options.logger.debug(
              `rule ${this.options.ruleType.id}:${this.rule?.id}: '${this.rule?.name}' has no recovery context specified for recovered alert ${alert.id}`
            );
          }
        }
      }
    }
  }

  private logAlerts(eventLogger: AlertingEventLogger, metricsStore: RuleRunMetricsStore) {
    const activeAlerts = this.createdAlerts.filter(({ status }) => status === 'active');
    const newAlerts = this.createdAlerts.filter(
      ({ status, duration }) => status === 'active' && duration === '0'
    );
    const recoveredAlerts = this.createdAlerts.filter(({ status }) => status === 'recovered');

    metricsStore.setNumberOfNewAlerts(newAlerts.length);
    metricsStore.setNumberOfActiveAlerts(activeAlerts.length);
    metricsStore.setNumberOfRecoveredAlerts(recoveredAlerts.length);

    for (const alert of this.preparedAlerts) {
      const { id, actionGroup, actionSubgroup, start, duration, end, status } = alert;
      let message: string = '';
      let action: string = '';

      if (status === 'recovered') {
        action = EVENT_LOG_ACTIONS.recoveredInstance;
        message = `${this.options.ruleType.id}:${this.rule?.id}: '${this.rule?.name}' alert '${id}' has recovered`;
      } else if (status === 'active') {
        if (duration === '0') {
          action = EVENT_LOG_ACTIONS.newInstance;
          message = `${this.options.ruleType.id}:${this.rule?.id}: '${this.rule?.name}' created new alert: '${id}'`;
        } else {
          action = EVENT_LOG_ACTIONS.activeInstance;
          message = `${this.options.ruleType.id}:${this.rule?.id}: '${
            this.rule?.name
          }' active alert: '${id}' in ${
            actionSubgroup
              ? `actionGroup(subgroup): '${actionGroup}(${actionSubgroup})'`
              : `actionGroup: '${actionGroup}'`
          }`;
        }
      }

      eventLogger.logAlert({
        action,
        id,
        group: actionGroup,
        subgroup: actionSubgroup,
        message,
        state: {
          start,
          end,
          duration,
        },
      });
    }
  }
}
