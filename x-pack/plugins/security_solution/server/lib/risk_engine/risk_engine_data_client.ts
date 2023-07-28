/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Metadata } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import type {
  ClusterPutComponentTemplateRequest,
  TransformGetTransformStatsResponse,
  TransformGetTransformStatsTransformStats,
} from '@elastic/elasticsearch/lib/api/types';
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
  getIndexPattern,
  totalFieldsLimit,
  mappingComponentName,
  ilmPolicyName,
  ilmPolicy,
} from './configurations';
import { createDataStream } from './utils/create_datastream';
import type { RiskEngineDataWriter as Writer } from './risk_engine_data_writer';
import { RiskEngineDataWriter } from './risk_engine_data_writer';
import { riskEngineConfigurationTypeName } from './saved_object';
import type { InitRiskEngineResult } from '../../../common/risk_engine/types';
import { RiskEngineStatus } from '../../../common/risk_engine/types';
import {
  getRiskScorePivotTransformId,
  getRiskScoreLatestTransformId,
} from '../../../common/utils/risk_score_modules';
import { RiskScoreEntity } from '../../../common/search_strategy';
interface SavedObjectsClients {
  savedObjectsClient: SavedObjectsClientContract;
}
interface InitOpts extends SavedObjectsClients {
  namespace: string;
  user: AuthenticatedUser | null | undefined;
}

interface UpdateConfigOpts extends SavedObjectsClients {
  user: AuthenticatedUser | null | undefined;
}

interface InitializeRiskEngineResourcesOpts {
  namespace?: string;
}

interface RiskEngineDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}

interface Configuration {
  enable: boolean;
  last_updated_by: string;
}

export class RiskEngineDataClient {
  private writerCache: Map<string, Writer> = new Map();
  constructor(private readonly options: RiskEngineDataClientOpts) {}

  public async init({ namespace, savedObjectsClient, user }: InitOpts) {
    const result: InitRiskEngineResult = {
      leggacyRiskEngineDisabled: false,
      riskEngineResourcesInstalled: false,
      riskEngineConfigurationCreated: false,
      riskEngineEnabled: false,
      errors: [] as string[],
    };

    try {
      result.leggacyRiskEngineDisabled = await this.disableLegacyRiskEngine({ namespace });
    } catch (e) {
      result.leggacyRiskEngineDisabled = false;
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
      await this.initSavedObjects({ savedObjectsClient, user });
      result.riskEngineConfigurationCreated = true;
    } catch (e) {
      result.errors.push(e.message);
      return result;
    }

    try {
      await this.enableRiskEngine({ savedObjectsClient, user });
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
      esClient: await this.options.elasticsearchClientPromise,
      namespace,
      index,
      logger: this.options.logger,
    });

    this.writerCache.set(namespace, writer);
    return writer;
  }

  public async getStatus({
    savedObjectsClient,
    namespace,
  }: SavedObjectsClients & {
    namespace: string;
  }) {
    const riskEgineStatus = await this.getCurrentStatus({ savedObjectsClient });
    const legacyRiskEgineStatus = await this.getLegacyStatus({ namespace });
    const lastUpdatedBy = await this.getLastUpdatedBy({ savedObjectsClient });
    return { riskEgineStatus, legacyRiskEgineStatus, lastUpdatedBy };
  }

  public async enableRiskEngine({ savedObjectsClient, user }: UpdateConfigOpts) {
    // code to run task

    return this.udpateSavedObjectAttribute({
      savedObjectsClient,
      user,
      attributes: {
        enable: true,
      },
    });
  }

  public async disableRiskEngine({ savedObjectsClient, user }: UpdateConfigOpts) {
    // code to stop task

    return this.udpateSavedObjectAttribute({
      savedObjectsClient,
      user,
      attributes: {
        enable: false,
      },
    });
  }

  private async udpateSavedObjectAttribute({
    savedObjectsClient,
    attributes,
    user,
  }: UpdateConfigOpts & {
    attributes: {
      enable: boolean;
    };
  }) {
    const savedObjectConfiguration = await this.getConfigurationSavedObject({
      savedObjectsClient,
    });

    if (!savedObjectConfiguration) {
      throw new Error('There no saved object configuration for risk engine');
    }

    const result = await savedObjectsClient.update(
      riskEngineConfigurationTypeName,
      savedObjectConfiguration.id,
      {
        ...attributes,
        last_updated_by: user?.username ?? '',
      },
      {
        refresh: 'wait_for',
      }
    );

    return result;
  }

  private async disableLegacyRiskEngine({ namespace }: { namespace: string }) {
    const legacyRiskEgineStatus = await this.getLegacyStatus({ namespace });

    if (
      legacyRiskEgineStatus === RiskEngineStatus.DISABLED ||
      legacyRiskEgineStatus === RiskEngineStatus.NOT_INSTALLED
    ) {
      return true;
    }

    const esClient = await this.options.elasticsearchClientPromise;
    const transforms = await this.getLegacyTransforms({ namespace });

    const stopTransformRequests = transforms.map((t) =>
      esClient.transform.deleteTransform({
        transform_id: t.id,
        force: true,
      })
    );

    await Promise.allSettled(stopTransformRequests);

    const newLegacyRiskEgineStatus = await this.getLegacyStatus({ namespace });

    return newLegacyRiskEgineStatus === RiskEngineStatus.DISABLED;
  }

  private async getLastUpdatedBy({ savedObjectsClient }: SavedObjectsClients) {
    const configuration = await this.getConfiguration({ savedObjectsClient });

    if (configuration) {
      return configuration.last_updated_by;
    }

    return '';
  }

  private async getCurrentStatus({ savedObjectsClient }: SavedObjectsClients) {
    const configuration = await this.getConfiguration({ savedObjectsClient });

    if (configuration) {
      return configuration.enable ? RiskEngineStatus.ENABLED : RiskEngineStatus.DISABLED;
    }

    return RiskEngineStatus.NOT_INSTALLED;
  }

  private async getLegacyTransforms({ namespace }: { namespace: string }) {
    const esClient = await this.options.elasticsearchClientPromise;

    const getTransformStatsRequests: Array<Promise<TransformGetTransformStatsResponse>> = [];
    [RiskScoreEntity.host, RiskScoreEntity.user].forEach((entity) => {
      getTransformStatsRequests.push(
        esClient.transform.getTransformStats({
          transform_id: getRiskScorePivotTransformId(entity, namespace),
        })
      );
      getTransformStatsRequests.push(
        esClient.transform.getTransformStats({
          transform_id: getRiskScoreLatestTransformId(entity, namespace),
        })
      );
    });

    const result = await Promise.allSettled(getTransformStatsRequests);

    const fulfuletGetTransformStats = result
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<TransformGetTransformStatsResponse>).value);

    const transforms = fulfuletGetTransformStats.reduce((acc, val) => {
      return [...acc, ...val.transforms];
    }, [] as TransformGetTransformStatsTransformStats[]);

    return transforms;
  }

  private async getLegacyStatus({ namespace }: { namespace: string }) {
    const transforms = await this.getLegacyTransforms({ namespace });

    if (transforms.length === 0) {
      return RiskEngineStatus.NOT_INSTALLED;
    }

    const notStoppedTransformsExisted = transforms.some((t) => t.state !== 'stopped');

    if (notStoppedTransformsExisted) {
      return RiskEngineStatus.ENABLED;
    }

    return RiskEngineStatus.DISABLED;
  }

  private async getConfigurationSavedObject({ savedObjectsClient }: SavedObjectsClients) {
    const savedObjectsResponse = await savedObjectsClient.find({
      type: riskEngineConfigurationTypeName,
    });
    return savedObjectsResponse.saved_objects?.[0];
  }

  private async getConfiguration({
    savedObjectsClient,
  }: SavedObjectsClients): Promise<Configuration | null> {
    try {
      const savedObjectConfiguration = await this.getConfigurationSavedObject({
        savedObjectsClient,
      });
      const configuration = savedObjectConfiguration?.attributes;

      if (configuration) {
        return configuration as Configuration;
      }

      return null;
    } catch (e) {
      this.options.logger.error(`Can't get saved object configuration: ${e.message}`);
      return null;
    }
  }


  private async initSavedObjects({ savedObjectsClient, user }: UpdateConfigOpts) {
    return savedObjectsClient.create(riskEngineConfigurationTypeName, {
      enable: false,
      last_updated_by: user?.username ?? '',
    });
  }

  public async initializeResources({
    namespace = DEFAULT_NAMESPACE_STRING,
  }: InitializeRiskEngineResourcesOpts) {
    try {
      const esClient = await this.options.elasticsearchClientPromise;

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
    }
  }
}
