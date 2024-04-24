/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingDynamicMapping,
  Metadata,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  createOrUpdateComponentTemplate,
  createOrUpdateIndexTemplate,
} from '@kbn/alerting-plugin/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { AuditLogger } from '@kbn/security-plugin-types-server';
import {
  getIndexPatternDataStream,
  getTransformOptions,
  mappingComponentName,
  riskScoreFieldMap,
  totalFieldsLimit,
} from './configurations';
import { createDataStream } from '../utils/create_datastream';
import type { RiskEngineDataWriter as Writer } from './risk_engine_data_writer';
import { RiskEngineDataWriter } from './risk_engine_data_writer';
import { getRiskScoreLatestIndex } from '../../../../common/entity_analytics/risk_engine';
import { createTransform, getLatestTransformId } from '../utils/transforms';
import { getRiskInputsIndex } from './get_risk_inputs_index';

import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { retryTransientEsErrors } from '../utils/retry_transient_es_errors';
import { RiskScoreAuditActions } from './audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';

interface RiskScoringDataClientOpts {
  logger: Logger;
  kibanaVersion: string;
  esClient: ElasticsearchClient;
  namespace: string;
  soClient: SavedObjectsClientContract;
  auditLogger?: AuditLogger | undefined;
}

export class RiskScoreDataClient {
  private writerCache: Map<string, Writer> = new Map();
  constructor(private readonly options: RiskScoringDataClientOpts) {}

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

  public getRiskInputsIndex = ({ dataViewId }: { dataViewId: string }) =>
    getRiskInputsIndex({
      dataViewId,
      logger: this.options.logger,
      soClient: this.options.soClient,
    });

  public async init() {
    const namespace = this.options.namespace;

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
              lifecycle: {},
              settings: {
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

      await createOrUpdateIndex({
        esClient,
        logger: this.options.logger,
        options: {
          index: getRiskScoreLatestIndex(namespace),
          mappings: mappingFromFieldMap(riskScoreFieldMap, false),
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

      this.options.auditLogger?.log({
        message: 'System installed risk engine Elasticsearch components',
        event: {
          action: RiskScoreAuditActions.RISK_ENGINE_INSTALL,
          category: AUDIT_CATEGORY.DATABASE,
          type: AUDIT_TYPE.CHANGE,
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
    } catch (error) {
      this.options.logger.error(`Error initializing risk engine resources: ${error.message}`);
      throw error;
    }
  }
  /**
   * Ensures that configuration migrations for risk score indices are seamlessly handled across Kibana upgrades.
   *
   * Upgrades:
   * - Migrating to 8.12+ requires a change to the risk score latest transform index's 'dynamic' setting to ensure that
   * unmapped fields are allowed within stored documents.
   *
   */
  public async upgradeIfNeeded() {
    const desiredDynamicValue = 'false';
    const currentDynamicValue = await this.getRiskScoreLatestIndexDynamicConfiguration();
    if (currentDynamicValue !== desiredDynamicValue) {
      await this.setRiskScoreLatestIndexDynamicConfiguration(desiredDynamicValue);
    }
  }

  private async getRiskScoreLatestIndexDynamicConfiguration(): Promise<string | undefined> {
    const riskScoreLatestIndexName = getRiskScoreLatestIndex(this.options.namespace);
    const riskScoreLatestIndexResponse = await retryTransientEsErrors(
      () => this.options.esClient.indices.get({ index: riskScoreLatestIndexName }),
      { logger: this.options.logger }
    );
    return riskScoreLatestIndexResponse[riskScoreLatestIndexName]?.mappings?.dynamic?.toString();
  }

  /**
   * Sets the risk score latest index's 'dynamic' mapping property to the desired value.
   * @throws Error if the index does not exist.
   */
  private async setRiskScoreLatestIndexDynamicConfiguration(dynamic: MappingDynamicMapping) {
    return retryTransientEsErrors(
      () =>
        this.options.esClient.indices.putMapping({
          index: getRiskScoreLatestIndex(this.options.namespace),
          dynamic,
        }),
      { logger: this.options.logger }
    );
  }
}
