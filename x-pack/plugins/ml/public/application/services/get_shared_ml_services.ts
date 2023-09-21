/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type HttpStart } from '@kbn/core-http-browser';
import { type UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ElasticModels } from './elastic_models_service';
import { HttpService } from './http_service';
import { mlApiServicesProvider } from './ml_api_service';
import { mlUsageCollectionProvider } from './usage_collection';
import { MlCapabilitiesService } from '../capabilities/check_capabilities';
import { MlLicense } from '../../../common/license';

export type MlSharedServices = ReturnType<typeof getMlSharedServices>;

/**
 * Provides global services available across the entire ML app.
 */
export function getMlSharedServices(
  httpStart: HttpStart,
  isServerless: boolean,
  usageCollection?: UsageCollectionSetup
) {
  const httpService = new HttpService(httpStart);
  const mlApiServices = mlApiServicesProvider(httpService);

  return {
    httpService,
    mlApiServices,
    mlUsageCollection: mlUsageCollectionProvider(usageCollection),
    mlCapabilities: new MlCapabilitiesService(mlApiServices),
    mlLicense: new MlLicense(),
    elasticModels: new ElasticModels(mlApiServices.trainedModels),
    isServerless,
  };
}
