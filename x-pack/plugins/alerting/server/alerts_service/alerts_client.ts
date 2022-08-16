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
  private hasReachedAlertLimit: boolean = false;

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

  public async loadExistingAlerts({
    ruleId,
    previousRuleExecutionUuid,
    alertsIndex,
  }: LoadExistingAlertsParams): Promise<AlertSchema[]> {
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
                    'rule.id': ruleId,
                  },
                },
                {
                  term: {
                    'rule.execution.id': previousRuleExecutionUuid,
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
      this.hasReachedAlertLimit = true;
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
    // Update alert with status and prepare for writing
    this.prepareAlerts(this.options.ruleType.autoRecoverAlerts ?? true);

    // Bulk index alerts
    const esClient = await this.options.elasticsearchClientPromise;
    await esClient.bulk({});
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
      const recoveredAlerts = this.existingAlerts.filter(
        ({ id: id1 }) => !this.createdAlerts.some(({ id: id2 }) => id2 === id1)
      );

      for (const alert of recoveredAlerts) {
        // Look for updates to this alert
        const updatedAlert = this.updatedAlerts.find(({ id }) => id === alert.id);
        if (updatedAlert) {
          this.preparedAlerts.push({
            ...alert,
            ...updatedAlert,
            actionGroup: RecoveredActionGroup.id,
            status: 'recovered',
            end: currentTime,
          });
        } else {
          // TODO - This alert has recovered but there are no updates to it
          // What should we do here?
          //  - 1. Strip out previous information and write it with the bare minimum of information?
          //  - 2. Persist information from previous run? This could include context and state
          //         fields that might not be relevant anymore
        }
      }
    }
  }
}
