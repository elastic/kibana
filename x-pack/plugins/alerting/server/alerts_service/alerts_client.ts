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
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  IAlertsClient,
  PublicAlertsClient,
  DEFAULT_ALERTS_INDEX,
  LoadExistingAlertsParams,
  AlertSchema,
  CreateAlertSchema,
  AlertRuleSchema,
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
  }: LoadExistingAlertsParams): Promise<AlertSchema[]> {
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
      throw err;
    }

    return [];
  }

  public create(alert: CreateAlertSchema) {
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
      return [];
    }
    return [];
  }

  public update(id: string, updatedAlert: Partial<AlertSchema>) {}

  public async writeAlerts() {
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

    // TODO - write event log documents
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
        });
      } else {
        // Add current time as start time, seed duration with '0' and generate uuid
        this.preparedAlerts.push({
          ...alert,
          start: currentTime,
          duration: '0',
          uuid: uuid.v4(),
        });
      }
    }

    // Recovered alerts
    if (shouldRecover) {
      this.options.logger.info('calculating recovery alerts');
      const recoveredAlerts = this.existingAlerts.filter(
        ({ id: id1 }) => !this.createdAlerts.some(({ id: id2 }) => id2 === id1)
      );

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
          });
        }
      }
    }
  }
}
