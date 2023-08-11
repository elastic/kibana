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
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

import {
  riskScoreFieldMap,
  getIndexPattern,
  totalFieldsLimit,
  mappingComponentName,
  ilmPolicyName,
  ilmPolicy,
} from './configurations';
import { createDataStream } from './utils/create_datastream';
import type { RiskEngineDataWriter as Writer } from './risk_engine_data_writer';
import { RiskEngineDataWriter } from './risk_engine_data_writer';
import type { InitRiskEngineResult } from '../../../common/risk_engine/types';
import { RiskEngineStatus } from '../../../common/risk_engine/types';
import { getLegacyTransforms, removeLegacyTransforms } from './utils/risk_engine_transforms';
import {
  updateSavedObjectAttribute,
  getConfiguration,
  initSavedObjects,
} from './utils/saved_object_configuration';
import { getRiskInputsIndex } from './get_risk_inputs_index';
import { removeRiskScoringTask, startRiskScoringTask } from './tasks';

interface InitOpts {
  namespace: string;
  taskManager: TaskManagerStartContract;
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

  public async init({ namespace, taskManager }: InitOpts) {
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
      await initSavedObjects({
        savedObjectsClient: this.options.soClient,
        namespace,
      });
      result.riskEngineConfigurationCreated = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    try {
      await this.enableRiskEngine({ taskManager });
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

    await this.initializeResources({ namespace });
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

  public getConfiguration = () =>
    getConfiguration({
      savedObjectsClient: this.options.soClient,
    });

  public getRiskInputsIndex = ({ dataViewId }: { dataViewId: string }) =>
    getRiskInputsIndex({
      dataViewId,
      logger: this.options.logger,
      soClient: this.options.soClient,
    });

  public async getStatus({ namespace }: { namespace: string }) {
    const riskEngineStatus = await this.getCurrentStatus();
    const legacyRiskEngineStatus = await this.getLegacyStatus({ namespace });
    return { riskEngineStatus, legacyRiskEngineStatus };
  }

  public async enableRiskEngine({ taskManager }: { taskManager: TaskManagerStartContract }) {
    const configurationResult = await updateSavedObjectAttribute({
      savedObjectsClient: this.options.soClient,
      attributes: {
        enabled: true,
      },
    });

    await startRiskScoringTask({
      logger: this.options.logger,
      namespace: this.options.namespace,
      riskEngineDataClient: this,
      taskManager,
    });

    return configurationResult;
  }

  public async disableRiskEngine({ taskManager }: { taskManager: TaskManagerStartContract }) {
    await removeRiskScoringTask({
      namespace: this.options.namespace,
      taskManager,
      logger: this.options.logger,
    });

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
    const configuration = await this.getConfiguration();

    if (configuration) {
      return configuration.enabled ? RiskEngineStatus.ENABLED : RiskEngineStatus.DISABLED;
    }

    return RiskEngineStatus.NOT_INSTALLED;
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

      const indexPatterns = getIndexPattern(namespace);

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

      await this.initializeWriter(namespace, indexPatterns.alias);
    } catch (error) {
      this.options.logger.error(`Error initializing risk engine resources: ${error.message}`);
      throw error;
    }
  }
}
