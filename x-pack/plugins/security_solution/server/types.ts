/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreRequestHandlerContext,
  CustomRequestHandlerContext,
  IRouter,
  KibanaRequest,
} from '@kbn/core/server';
import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { FleetRequestHandlerContext } from '@kbn/fleet-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { ExceptionListClient, ListsApiRequestHandlerContext } from '@kbn/lists-plugin/server';
import type { AlertsClient, IRuleDataService } from '@kbn/rule-registry-plugin/server';

import type { Readable } from 'stream';
import type { Immutable } from '../common/endpoint/types';
import { AppClient } from './client';
import type { ConfigType } from './config';
import type {
  IDetectionEngineHealthClient,
  IRuleExecutionLogForRoutes,
} from './lib/detection_engine/rule_monitoring';
import type { FrameworkRequest } from './lib/framework';
import type { EndpointAuthz } from '../common/endpoint/types/authz';
import type { EndpointInternalFleetServicesInterface } from './endpoint/services/fleet';
import type { RiskEngineDataClient } from './lib/entity_analytics/risk_engine/risk_engine_data_client';
import type { RiskScoreDataClient } from './lib/entity_analytics/risk_score/risk_score_data_client';
import type { AssetCriticalityDataClient } from './lib/entity_analytics/asset_criticality';
export { AppClient };

export interface SecuritySolutionApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  getServerBasePath: () => string;
  getEndpointAuthz: () => Promise<Immutable<EndpointAuthz>>;
  getConfig: () => ConfigType;
  getFrameworkRequest: () => FrameworkRequest;
  getAppClient: () => AppClient;
  getSpaceId: () => string;
  getRuleDataService: () => IRuleDataService;
  getDetectionEngineHealthClient: () => IDetectionEngineHealthClient;
  getRuleExecutionLog: () => IRuleExecutionLogForRoutes;
  getRacClient: (req: KibanaRequest) => Promise<AlertsClient>;
  getExceptionListClient: () => ExceptionListClient | null;
  getInternalFleetServices: () => EndpointInternalFleetServicesInterface;
  getRiskEngineDataClient: () => RiskEngineDataClient;
  getRiskScoreDataClient: () => RiskScoreDataClient;
  getAssetCriticalityDataClient: () => AssetCriticalityDataClient;
}

export type SecuritySolutionRequestHandlerContext = CustomRequestHandlerContext<{
  securitySolution: SecuritySolutionApiRequestHandlerContext;
  actions: ActionsApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
  lists?: ListsApiRequestHandlerContext;
  fleet?: FleetRequestHandlerContext['fleet'];
}>;

export type SecuritySolutionPluginRouter = IRouter<SecuritySolutionRequestHandlerContext>;

/**
 * Readable returned by Hapi when `stream` is used to defined a property and/or route payload
 */
export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
    headers: Record<string, string>;
  };
}
