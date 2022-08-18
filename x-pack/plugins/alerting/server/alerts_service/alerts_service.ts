/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { AlertsClient } from './alerts_client';
import {
  DEFAULT_ALERTS_INDEX,
  ILM_POLICY_NAME,
  DEFAULT_ILM_POLICY,
  INDEX_TEMPLATE_NAME,
  ALERTS_COMPONENT_TEMPLATE_NAME,
  ECS_COMPONENT_TEMPLATE_NAME,
} from './types';

interface AlertsServiceParams {
  logger: Logger;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}
interface IAlertsService {
  /**
   * Initializes all the ES resources used by the alert client
   * - ILM policy
   * - Component templates
   * - Index templates
   * - Index
   *
   * Not using data streams because those are meant for append-only data
   * and we expect to mutate these documents
   */
  initialize(): void;

  /**
   * Creates and returns a new AlertsClient
   */
  createAlertsClient(ruleType: UntypedNormalizedRuleType, maxAlerts: number): void;
}

export class AlertsService implements IAlertsService {
  private initialized: boolean;

  constructor(private readonly options: AlertsServiceParams) {
    this.initialized = false;
  }

  public initialize() {
    // Only initialize once
    if (this.initialized) return;
    this.initialized = true;

    this.options.logger.debug(`Initializing resources for AlertsService`);

    // Using setImmediate to call async function but run it immediately
    setImmediate(async () => {
      const esClient = await this.options.elasticsearchClientPromise;
      this.createOrUpdateIlmPolicy(esClient);
      // Component templates will follow the new alerts as data schema which is TBD
      // Currently setting dynamic: true and allowing all fields
      // this.createOrUpdateComponentTemplates(esClient);
      this.createOrUpdateIndexTemplate(esClient);

      // TODO - check if it exists first
      this.createConcreteWriteIndex(esClient);
    });
  }

  public createAlertsClient(ruleType: UntypedNormalizedRuleType, maxAlerts: number) {
    return new AlertsClient({
      logger: this.options.logger,
      elasticsearchClientPromise: this.options.elasticsearchClientPromise,
      ruleType,
      maxAlerts,
    });
  }

  /**
   * Create ILM policy if it doesn't already exist
   */
  private createOrUpdateIlmPolicy(esClient: ElasticsearchClient) {
    this.options.logger.debug(`Installing ILM policy`);

    try {
      esClient.ilm.putLifecycle({
        name: ILM_POLICY_NAME,
        body: DEFAULT_ILM_POLICY,
      });
    } catch (err) {
      this.options.logger.error(`Error installing ILM policy - ${err.message}`);
      throw err;
    }
  }

  private createOrUpdateComponentTemplates(esClient: ElasticsearchClient) {
    this.options.logger.debug(`Installing component templates`);

    try {
      esClient.cluster.putComponentTemplate({
        name: ALERTS_COMPONENT_TEMPLATE_NAME,
        template: {},
      });
      esClient.cluster.putComponentTemplate({
        name: ECS_COMPONENT_TEMPLATE_NAME,
        template: {},
      });
    } catch (err) {
      this.options.logger.error(`Error installing component templates - ${err.message}`);
      throw err;
    }
  }

  private createOrUpdateIndexTemplate(esClient: ElasticsearchClient) {
    this.options.logger.debug(`Installing index template`);

    try {
      esClient.indices.putIndexTemplate({
        name: INDEX_TEMPLATE_NAME,
        index_patterns: [`${DEFAULT_ALERTS_INDEX}*`],
        // composed_of: [],
        template: {
          settings: {
            hidden: true,
            index: {
              lifecycle: {
                name: ILM_POLICY_NAME,
                rollover_alias: DEFAULT_ALERTS_INDEX,
              },
            },
          },
          mappings: {
            dynamic: true,
          },
        },
      });
    } catch (err) {
      this.options.logger.error(`Error installing index template - ${err.message}`);
      throw err;
    }
  }

  private createConcreteWriteIndex(esClient: ElasticsearchClient) {
    this.options.logger.debug(`Creating concrete write index`);

    try {
      esClient.indices.create({
        index: `${DEFAULT_ALERTS_INDEX}-000001`,
        aliases: {
          [DEFAULT_ALERTS_INDEX]: {
            is_write_index: true,
          },
        },
      });
    } catch (err) {
      this.options.logger.error(`Error creating concrete write index - ${err.message}`);
      // throw err;
    }
  }
}
