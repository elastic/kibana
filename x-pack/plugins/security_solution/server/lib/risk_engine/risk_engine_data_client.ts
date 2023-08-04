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
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
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

interface InitializeRiskEngineResourcesOpts {
  namespace?: string;
}

interface RiskEngineDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}

export class RiskEngineDataClient {
  private writerCache: Map<string, Writer> = new Map();
  constructor(private readonly options: RiskEngineDataClientOpts) {}

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
