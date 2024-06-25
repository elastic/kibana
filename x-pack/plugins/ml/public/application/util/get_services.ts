/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';

import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

import { MlLicense } from '../../../common/license';
import { MlCapabilitiesService } from '../capabilities/check_capabilities';
import { fieldFormatServiceFactory } from '../services/field_format_service_factory';
import { HttpService } from '../services/http_service';
import { mlApiServicesProvider } from '../services/ml_api_service';
import { mlUsageCollectionProvider } from '../services/usage_collection';
import { indexServiceFactory } from './index_service';

/**
 * Provides global services available across the entire ML app.
 */
export function getMlGlobalServices(
  httpStart: HttpStart,
  dataViews: DataViewsContract,
  usageCollection?: UsageCollectionSetup
) {
  const httpService = new HttpService(httpStart);
  const mlApiServices = mlApiServicesProvider(httpService);
  // Note on the following services:
  // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
  //   but it's not being made available as part of global services. Since it's just
  //   some stateless utils `useMlIndexUtils()` should be used from within components.
  // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
  //   so because of its own state it needs to be made available as a global service.
  //   In the long run we should again try to get rid of it here and make it available via
  //   its own context or possibly without having a singleton like state at all, since the
  //   way this manages its own state right now doesn't consider React component lifecycles.
  const mlIndexUtils = indexServiceFactory(dataViews);
  const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

  return {
    httpService,
    mlApiServices,
    mlFieldFormatService,
    mlUsageCollection: mlUsageCollectionProvider(usageCollection),
    mlCapabilities: new MlCapabilitiesService(mlApiServices),
    mlLicense: new MlLicense(),
  };
}
