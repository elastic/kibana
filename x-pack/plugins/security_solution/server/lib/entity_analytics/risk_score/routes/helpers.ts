/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../..';
import { assetCriticalityServiceFactory } from '../../asset_criticality';
import { riskScoreServiceFactory } from '../risk_score_service';

export function buildRiskScoreServiceForRequest(
  securityContext: SecuritySolutionApiRequestHandlerContext,
  coreContext: CoreRequestHandlerContext,
  logger: Logger
) {
  const esClient = coreContext.elasticsearch.client.asCurrentUser;
  const spaceId = securityContext.getSpaceId();
  const assetCriticalityDataClient = securityContext.getAssetCriticalityDataClient();
  const assetCriticalityService = assetCriticalityServiceFactory({
    assetCriticalityDataClient,
    uiSettingsClient: coreContext.uiSettings.client,
  });
  const riskEngineDataClient = securityContext.getRiskEngineDataClient();
  const riskScoreDataClient = securityContext.getRiskScoreDataClient();

  return riskScoreServiceFactory({
    assetCriticalityService,
    esClient,
    logger,
    riskEngineDataClient,
    riskScoreDataClient,
    spaceId,
  });
}
