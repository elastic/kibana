/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isActivePlatinumLicense } from '../../../common/license_check';
import { APMRouteHandlerResources } from '../../routes/typings';

export interface MlSetup {
  mlSystem: any;
  anomalyDetectors: any;
  modules: any;
}

export async function getMlSetup({
  plugins,
  context,
  request,
}: APMRouteHandlerResources) {
  const [coreContext, licensingContext] = await Promise.all([
    context.core,
    context.licensing,
  ]);

  return plugins.ml && isActivePlatinumLicense(licensingContext.license)
    ? {
        mlSystem: plugins.ml.setup.mlSystemProvider(
          request,
          coreContext.savedObjects.client
        ),
        anomalyDetectors: plugins.ml.setup.anomalyDetectorsProvider(
          request,
          coreContext.savedObjects.client
        ),
        modules: plugins.ml.setup.modulesProvider(
          request,
          coreContext.savedObjects.client
        ),
      }
    : undefined;
}
