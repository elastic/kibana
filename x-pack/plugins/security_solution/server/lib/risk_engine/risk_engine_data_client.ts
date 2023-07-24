/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Metadata } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
import { RiskEngineStatus } from './types';
import {
  getRiskScorePivotTransformId,
  getRiskScoreLatestTransformId,
} from '../../../common/utils/risk_score_modules';
import { RiskScoreEntity } from '../../../common/search_strategy';
interface SavedObjectsClients {
  savedObjectsClient: SavedObjectsClientContract;
}
interface InitOpts extends SavedObjectsClients {
  namespace?: string;
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
}

export class RiskEngineDataClient {
  private writerCache: Map<string, Writer> = new Map();
  constructor(private readonly options: RiskEngineDataClientOpts) {}

  public async init({ namespace, savedObjectsClient }: InitOpts) {
    await this.initializeResources({ namespace });
    return this.initSavedObjects({ savedObjectsClient });
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
    return { riskEgineStatus, legacyRiskEgineStatus };
  }

  private async getCurrentStatus({ savedObjectsClient }: SavedObjectsClients) {
    const configuration = await this.getConfiguration({ savedObjectsClient });

    if (configuration) {
      return configuration.enable ? RiskEngineStatus.ENABLED : RiskEngineStatus.DISABLED;
    }

    return RiskEngineStatus.NOT_INSTALLED;
  }

  private async getLegacyStatus({ namespace }: { namespace: string }) {
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

    if (transforms.length === 0) {
      return RiskEngineStatus.NOT_INSTALLED;
    }

    const notStoppedTransformsExisted = transforms.some((t) => t.state !== 'stopped');

    if (notStoppedTransformsExisted) {
      return RiskEngineStatus.ENABLED;
    }

    return RiskEngineStatus.DISABLED;
  }

  private async getConfiguration({
    savedObjectsClient,
  }: SavedObjectsClients): Promise<Configuration | null> {
    try {
      const savedObjectsResponse = await savedObjectsClient.find({
        type: riskEngineConfigurationTypeName,
      });
      const configuration = savedObjectsResponse.saved_objects?.[0]?.attributes;

      if (configuration) {
        return configuration as Configuration;
      }

      return null;
    } catch (e) {
      this.options.logger.error(`Can't get saved object configuration: ${e.message}`);
      return null;
    }
  }

  private async initSavedObjects({
    savedObjectsClient,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
  }) {
    return savedObjectsClient.create(riskEngineConfigurationTypeName, { enable: false });
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
