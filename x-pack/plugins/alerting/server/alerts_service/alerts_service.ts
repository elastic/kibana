/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import {
  alertFieldMap,
  ecsFieldMap,
  getComponentTemplateFromFieldMap,
} from '../../common/alert_schema';
import { ILM_POLICY_NAME, DEFAULT_ILM_POLICY } from './default_lifecycle_policy';
import { ALERTS_COMPONENT_TEMPLATE_NAME, ECS_COMPONENT_TEMPLATE_NAME } from './types';

interface AlertsServiceParams {
  logger: Logger;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}
interface IAlertsService {
  /**
   * Initializes all the ES resources used by the alerts client
   * - ILM policy
   * - Component templates
   * - Index templates
   * - Concrete write index
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
    setImmediate(async () => {
      const esClient = await this.options.elasticsearchClientPromise;

      // todo wrap all calls in retry
      await this.createOrUpdateIlmPolicy(esClient);
      await this.createOrUpdateComponentTemplates(esClient);
      //      await this.createOrUpdateIndexTemplate(esClient);

      // TODO - check if it exists first
      //      await this.createConcreteWriteIndex(esClient);
    });
  }

  /**
   * Creates ILM policy if it doesn't already exist, updates it if it does
   */
  private async createOrUpdateIlmPolicy(esClient: ElasticsearchClient) {
    this.options.logger.info(`Installing ILM policy ${ILM_POLICY_NAME}`);

    try {
      await esClient.ilm.putLifecycle({
        name: ILM_POLICY_NAME,
        body: DEFAULT_ILM_POLICY,
      });
    } catch (err) {
      this.options.logger.error(`Error installing ILM policy ${ILM_POLICY_NAME} - ${err.message}`);
      throw err;
    }
  }

  private async createOrUpdateComponentTemplates(esClient: ElasticsearchClient) {
    await Promise.all([
      this.createOrUpdateComponentTemplate(
        esClient,
        getComponentTemplateFromFieldMap({
          name: ALERTS_COMPONENT_TEMPLATE_NAME,
          fieldMap: alertFieldMap,
          fieldLimit: 100,
        })
      ),
      this.createOrUpdateComponentTemplate(
        esClient,
        getComponentTemplateFromFieldMap({
          name: ECS_COMPONENT_TEMPLATE_NAME,
          fieldMap: ecsFieldMap,
          fieldLimit: 2000,
        })
      ),
    ]);
  }

  private async createOrUpdateComponentTemplate(
    esClient: ElasticsearchClient,
    template: ClusterPutComponentTemplateRequest
  ) {
    this.options.logger.info(`Installing component template ${template.name}`);

    try {
      await esClient.cluster.putComponentTemplate(template);
    } catch (err) {
      this.options.logger.error(
        `Error installing component template ${template.name} - ${err.message}`
      );
      throw err;
    }
  }

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

  // private async installWithRetry() {}
}
