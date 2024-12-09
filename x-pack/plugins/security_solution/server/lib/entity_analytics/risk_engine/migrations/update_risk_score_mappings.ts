/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import { first } from 'lodash/fp';
import type { EntityAnalyticsMigrationsParams } from '../../migrations';
import { RiskEngineDataClient } from '../risk_engine_data_client';
import { getDefaultRiskEngineConfiguration } from '../utils/saved_object_configuration';
import { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';
import type { RiskEngineConfiguration } from '../../types';
import { riskEngineConfigurationTypeName } from '../saved_object';

export const MAX_PER_PAGE = 10_000;

// ADD entity type service to the entity analytics indices
export const updateRiskScoreMappings = async ({
  auditLogger,
  logger,
  getStartServices,
  kibanaVersion,
}: EntityAnalyticsMigrationsParams) => {
  const [coreStart] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace: '*' });

  const savedObjectsResponse = await soClient.find<RiskEngineConfiguration>({
    type: riskEngineConfigurationTypeName,
    perPage: MAX_PER_PAGE,
  });

  await asyncForEach(savedObjectsResponse.saved_objects, async (savedObject) => {
    // we only install one Risk Engine Configuration object per space
    const namespace = first(savedObject.namespaces);
    if (!namespace) {
      logger.error('Unexpected saved object. Risk Score saved objects must have a namespace');
      return;
    }
    const newConfig = await getDefaultRiskEngineConfiguration({ namespace });

    if (savedObject.attributes._meta?.mappingsVersion !== newConfig._meta.mappingsVersion) {
      logger.info(
        `Starting Risk Score mappings update from version ${savedObject.attributes._meta?.mappingsVersion} to version ${newConfig._meta.mappingsVersion}`
      );

      const riskEngineDataClient = new RiskEngineDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
        auditLogger,
      });
      const riskScoreDataClient = new RiskScoreDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
        auditLogger,
      });

      if (savedObject.attributes._meta?.mappingsVersion !== newConfig._meta.mappingsVersion) {
        await riskScoreDataClient.createOrUpdateRiskScoreLatestIndex();
        await riskScoreDataClient.createOrUpdateRiskScoreIndexTemplate();
        await riskScoreDataClient.updateRiskScoreTimeSeriesIndexMappings();
        await riskEngineDataClient.updateConfiguration({
          _meta: {
            mappingsVersion: newConfig._meta.mappingsVersion,
          },
        });

        logger.debug(`Risk score mappings updated to version ${newConfig._meta.mappingsVersion}`);
      }
    }
  });
};

// TODO CREATE A MIGRATION CLIENT LIKE THE ONE FOR ASSET CRITICALITY?

// TODO TEST MULTIPLE NAMESPACES
// TODO TEST NO NAMESPACES
// TODO TEST 1 NAMESPACES
// TODO DOES THE BUNDLE SIZE EXPLODE?
