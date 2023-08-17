/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Metadata } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  createOrUpdateComponentTemplate,
  createOrUpdateIlmPolicy,
  createOrUpdateIndexTemplate,
} from '@kbn/alerting-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { Logger, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import {
  riskScoreFieldMap,
  getIndexPatternDataStream,
  totalFieldsLimit,
  mappingComponentName,
  ilmPolicyName,
  ilmPolicy,
  getLatestTransformId,
  getTransformOptions,
} from './configurations';
import { createDataStream } from './utils/create_datastream';
import type { RiskEngineDataWriter as Writer } from './risk_engine_data_writer';
import { RiskEngineDataWriter } from './risk_engine_data_writer';
import type { InitRiskEngineResult } from '../../../common/risk_engine';
import {
  RiskEngineStatus,
  getRiskScoreLatestIndex,
  MAX_SPACES_COUNT,
} from '../../../common/risk_engine';
import {
  getLegacyTransforms,
  removeLegacyTransforms,
  startTransform,
  createTransform,
} from './utils/transforms';
import {
  updateSavedObjectAttribute,
  getConfiguration,
  initSavedObjects,
  getEnabledRiskEngineAmount,
} from './utils/saved_object_configuration';
import { createIndex } from './utils/create_index';

interface InitOpts {
  namespace: string;
}

interface InitializeRiskEngineResourcesOpts {
  namespace?: string;
}

interface RiskEngineDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  esClient: ElasticsearchClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
}

export class RiskEngineDataClient {
  private writerCache: Map<string, Writer> = new Map();
  constructor(private readonly options: RiskEngineDataClientOpts) {}

  public async init({ namespace }: InitOpts) {
    const result: InitRiskEngineResult = {
      legacyRiskEngineDisabled: false,
      riskEngineResourcesInstalled: false,
      riskEngineConfigurationCreated: false,
      riskEngineEnabled: false,
      errors: [] as string[],
    };

    try {
      result.legacyRiskEngineDisabled = await this.disableLegacyRiskEngine({ namespace });
    } catch (e) {
      result.legacyRiskEngineDisabled = false;
      result.errors.push(e.message);
    }

    try {
      await this.initializeResources({ namespace });
      result.riskEngineResourcesInstalled = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    try {
      await initSavedObjects({ savedObjectsClient: this.options.soClient });
      result.riskEngineConfigurationCreated = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    try {
      await this.enableRiskEngine();
      result.riskEngineEnabled = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    return result;
  }

  public async getWriter({ namespace }: { namespace: string }): Promise<Writer> {
    if (this.writerCache.get(namespace)) {
      return this.writerCache.get(namespace) as Writer;
    }
    const indexPatterns = getIndexPatternDataStream(namespace);
    await this.initializeWriter(namespace, indexPatterns.alias);
    return this.writerCache.get(namespace) as Writer;
  }

  private async initializeWriter(namespace: string, index: string): Promise<Writer> {
    const writer = new RiskEngineDataWriter({
      esClient: this.options.esClient,
      namespace,
      index,
      logger: this.options.logger,
    });

    this.writerCache.set(namespace, writer);
    return writer;
  }

  public async getStatus({ namespace }: { namespace: string }) {
    const riskEngineStatus = await this.getCurrentStatus();
    const legacyRiskEngineStatus = await this.getLegacyStatus({ namespace });
    const isMaxAmountOfRiskEnginesReached = await this.getIsMaxAmountOfRiskEnginesReached();
    return { riskEngineStatus, legacyRiskEngineStatus, isMaxAmountOfRiskEnginesReached };
  }

  public async enableRiskEngine() {
    // code to run task
    return updateSavedObjectAttribute({
      savedObjectsClient: this.options.soClient,
      attributes: {
        enabled: true,
      },
    });
  }

  public async disableRiskEngine() {
    // code to stop task

    return updateSavedObjectAttribute({
      savedObjectsClient: this.options.soClient,
      attributes: {
        enabled: false,
      },
    });
  }

  public async disableLegacyRiskEngine({ namespace }: { namespace: string }) {
    const legacyRiskEngineStatus = await this.getLegacyStatus({ namespace });

    if (legacyRiskEngineStatus === RiskEngineStatus.NOT_INSTALLED) {
      return true;
    }

    await removeLegacyTransforms({
      esClient: this.options.esClient,
      namespace,
    });

    const newlegacyRiskEngineStatus = await this.getLegacyStatus({ namespace });

    return newlegacyRiskEngineStatus === RiskEngineStatus.NOT_INSTALLED;
  }

  private async getCurrentStatus() {
    const configuration = await getConfiguration({ savedObjectsClient: this.options.soClient });

    if (configuration) {
      return configuration.enabled ? RiskEngineStatus.ENABLED : RiskEngineStatus.DISABLED;
    }

    return RiskEngineStatus.NOT_INSTALLED;
  }

  private async getIsMaxAmountOfRiskEnginesReached() {
    try {
      const amountOfEnabledConfigurations = await getEnabledRiskEngineAmount({
        savedObjectsClient: this.options.soClient,
      });

      return amountOfEnabledConfigurations >= MAX_SPACES_COUNT;
    } catch (e) {
      this.options.logger.error(`Error while getting amount of enabled risk engines: ${e.message}`);
      return false;
    }
  }

  private async getLegacyStatus({ namespace }: { namespace: string }) {
    const transforms = await getLegacyTransforms({ namespace, esClient: this.options.esClient });

    if (transforms.length === 0) {
      return RiskEngineStatus.NOT_INSTALLED;
    }

    return RiskEngineStatus.ENABLED;
  }

  public async initializeResources({
    namespace = DEFAULT_NAMESPACE_STRING,
  }: InitializeRiskEngineResourcesOpts) {
    try {
      const esClient = this.options.esClient;

      const indexPatterns = getIndexPatternDataStream(namespace);

      const indexMetadata: Metadata = {
        kibana: {
          version: this.options.kibanaVersion,
        },
        managed: true,
        namespace,
      };

      await Promise.all([
        createOrUpdateIlmPolicy({
          logger: this.options.logger,
          esClient,
          name: ilmPolicyName,
          policy: ilmPolicy,
        }),
        createOrUpdateComponentTemplate({
          logger: this.options.logger,
          esClient,
          template: {
            name: mappingComponentName,
            _meta: {
              managed: true,
            },
            template: {
              settings: {},
              mappings: mappingFromFieldMap(riskScoreFieldMap, 'strict'),
            },
          } as ClusterPutComponentTemplateRequest,
          totalFieldsLimit,
        }),
      ]);

      await createOrUpdateIndexTemplate({
        logger: this.options.logger,
        esClient,
        template: {
          name: indexPatterns.template,
          body: {
            data_stream: { hidden: true },
            index_patterns: [indexPatterns.alias],
            composed_of: [mappingComponentName],
            template: {
              settings: {
                auto_expand_replicas: '0-1',
                hidden: true,
                'index.lifecycle': {
                  name: ilmPolicyName,
                },
                'index.mapping.total_fields.limit': totalFieldsLimit,
              },
              mappings: {
                dynamic: false,
                _meta: indexMetadata,
              },
            },
            _meta: indexMetadata,
          },
        },
      });

      await createDataStream({
        logger: this.options.logger,
        esClient,
        totalFieldsLimit,
        indexPatterns,
      });

      await createIndex({
        esClient,
        logger: this.options.logger,
        options: {
          index: getRiskScoreLatestIndex(namespace),
          mappings: mappingFromFieldMap(riskScoreFieldMap, 'strict'),
        },
      });

      const transformId = getLatestTransformId(namespace);
      await createTransform({
        esClient,
        logger: this.options.logger,
        transform: {
          transform_id: transformId,
          ...getTransformOptions({
            dest: getRiskScoreLatestIndex(namespace),
            source: [indexPatterns.alias],
          }),
        },
      });

      await startTransform({ esClient, transformId });
    } catch (error) {
      this.options.logger.error(`Error initializing risk engine resources: ${error.message}`);
      throw error;
    }
  }
}
