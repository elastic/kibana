/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

/**
 * As internal user we check for existence of asset crititcality resources
 * and initialise it if it does not exist
 * @param context
 * @param logger
 */
export const checkAndInitAssetCriticalityResources = async (
  context: SecuritySolutionRequestHandlerContext,
  logger: Logger
) => {
  const securityContext = await context.securitySolution;
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const assetCriticalityDataClient = new AssetCriticalityDataClient({
    esClient,
    logger,
    auditLogger: securityContext.getAuditLogger(),
    namespace: securityContext.getSpaceId(),
  });

  const doesIndexExist = await assetCriticalityDataClient.doesIndexExist();

  if (!doesIndexExist) {
    logger.info('Asset criticality resources are not installed, initialising...');
    await assetCriticalityDataClient.init();
    logger.info('Asset criticality resources installed');
  }
};
