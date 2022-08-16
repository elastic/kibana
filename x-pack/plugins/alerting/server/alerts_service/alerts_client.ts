/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { DEFAULT_ALERTS_INDEX } from './alerts_service';

export type PublicAlertsClient = Pick<IAlertsClient, 'create' | 'getRecoveredAlerts' | 'update'>;

interface AlertsClientParams {
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}

interface GetExistingAlertsParams {
  ruleId: string;
  previousRuleExecutionUuid: string;
  alertsIndex?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface IAlertsClient<AlertSchema = any> {
  /**
   * Get alerts matching given rule ID and rule execution uuid
   * - Allow specifying a different index than the default (for security alerts)
   */
  getExistingAlerts(params: GetExistingAlertsParams): Promise<AlertSchema[]>;

  /**
   * Creates new alert document
   * - Do not allow specifying different index. Security alerts should use rule registry
   * - Schema of alert is context and state
   * - Include actionGroup and subActionGroup for alert in schema
   */
  create(): void;

  /**
   * Returns list of recovered alerts, as determined by framework
   * - Skip requiring done() to be called, just throw error if create() is called after this is called
   */
  getRecoveredAlerts(): void;

  /**
   * Partially update an alert document
   * - Can use this for recovery alerts
   * - Control which fields can be updated?
   */
  update(): void;

  /**
   * Triggers auto-recovery detection unless rule type has opted out
   * Writes all alerts to default index.
   */
  writeAlerts(): void;

  getExecutorServices(): PublicAlertsClient;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AlertsClient<AlertSchema = any> implements IAlertsClient {
  constructor(private readonly options: AlertsClientParams) {}

  public async getExistingAlerts({
    ruleId,
    previousRuleExecutionUuid,
    alertsIndex,
  }: GetExistingAlertsParams): Promise<AlertSchema[]> {
    const esClient = await this.options.elasticsearchClientPromise;
    const indexToQuery = alertsIndex ?? DEFAULT_ALERTS_INDEX;

    try {
      const {
        hits: { hits, total },
      } = await esClient.search({
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
                    'rule.execution.uuid': previousRuleExecutionUuid,
                  },
                },
              ],
            },
          },
        },
      });
    } catch (err) {
      throw err;
    }

    return [];
  }

  public create() {}
  public getRecoveredAlerts() {}
  public update() {}
  public writeAlerts() {}

  public getExecutorServices(): PublicAlertsClient {
    return {
      create: () => this.create(),
      update: () => this.update(),
      getRecoveredAlerts: () => this.getRecoveredAlerts(),
    };
  }
}
