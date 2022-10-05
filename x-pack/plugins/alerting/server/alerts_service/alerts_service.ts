/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { ILM_POLICY_NAME, DEFAULT_ILM_POLICY } from './types';

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
    // This is so initialize can remain a synchronous function used by the synchronous
    // alerting plugin setup function but we can use the async ES client
    setImmediate(async () => {
      try {
        const esClient = await this.options.elasticsearchClientPromise;
        await this.createOrUpdateIlmPolicy(esClient);
        // Component templates will follow the new alerts as data schema which is TBD
        // Currently setting dynamic: true and allowing all fields
        // this.createOrUpdateComponentTemplates(esClient);
        // await this.createOrUpdateIndexTemplate(esClient);

        // TODO - check if it exists first
        // await this.createConcreteWriteIndex(esClient);
      } catch (err) {
        this.options.logger.error(`Error initializing alerts service - ${err.message}`);
        this.initialized = false;
      }
    });
  }

  /**
   * Create ILM policy if it doesn't already exist
   */
  private async createOrUpdateIlmPolicy(esClient: ElasticsearchClient) {
    this.options.logger.info(`Installing ILM policy`);

    try {
      await esClient.ilm.putLifecycle({
        name: ILM_POLICY_NAME,
        body: DEFAULT_ILM_POLICY,
      });
    } catch (err) {
      this.options.logger.error(`Error installing ILM policy - ${err.message}`);
      throw err;
    }
  }

  // private async createOrUpdateComponentTemplates(esClient: ElasticsearchClient) {
  //   this.options.logger.debug(`Installing component templates`);

  //   try {
  //     await esClient.cluster.putComponentTemplate({
  //       name: ALERTS_COMPONENT_TEMPLATE_NAME,
  //       template: {},
  //     });
  //     esClient.cluster.putComponentTemplate({
  //       name: ECS_COMPONENT_TEMPLATE_NAME,
  //       template: {},
  //     });
  //   } catch (err) {
  //     this.options.logger.error(`Error installing component templates - ${err.message}`);
  //     throw err;
  //   }
  // }

  // private async createOrUpdateIndexTemplate(esClient: ElasticsearchClient) {
  //   this.options.logger.info(`Installing index template`);

  //   try {
  //     await esClient.indices.putIndexTemplate({
  //       name: INDEX_TEMPLATE_NAME,
  //       index_patterns: [`${DEFAULT_ALERTS_INDEX}*`],
  //       // composed_of: [],
  //       template: {
  //         settings: {
  //           hidden: true,
  //           index: {
  //             lifecycle: {
  //               name: ILM_POLICY_NAME,
  //               rollover_alias: DEFAULT_ALERTS_INDEX,
  //             },
  //           },
  //         },
  //         mappings: {
  //           dynamic: true,
  //         },
  //       },
  //     });
  //   } catch (err) {
  //     this.options.logger.error(`Error installing index template - ${err.message}`);
  //     throw err;
  //   }
  // }

  // private async createConcreteWriteIndex(esClient: ElasticsearchClient) {
  //   this.options.logger.info(`Creating concrete write index`);

  //   try {
  //     await esClient.indices.create({
  //       index: `${DEFAULT_ALERTS_INDEX}-000001`,
  //       aliases: {
  //         [DEFAULT_ALERTS_INDEX]: {
  //           is_write_index: true,
  //         },
  //       },
  //     });
  //   } catch (err) {
  //     this.options.logger.error(`Error creating concrete write index - ${err.message}`);
  //     // throw err;
  //   }
  // }
}
