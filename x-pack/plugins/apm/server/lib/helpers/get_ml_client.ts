/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MlAnomalyDetectors,
  MlMlSystem,
  MlModules,
} from '@kbn/ml-plugin/server';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { APMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export interface MlClient {
  mlSystem: MlMlSystem;
  anomalyDetectors: MlAnomalyDetectors;
  modules: MlModules;
}

export async function getMlClient({
  plugins,
  context,
  request,
}: APMRouteHandlerResources) {
  const [coreContext, licensingContext] = await Promise.all([
    context.core,
    context.licensing,
  ]);

  const mlplugin = plugins.ml;

  if (!mlplugin || !isActivePlatinumLicense(licensingContext.license)) {
    return;
  }
  return {
    mlSystem: mlplugin.setup.mlSystemProvider(
      request,
      coreContext.savedObjects.client
    ),
    anomalyDetectors: mlplugin.setup.anomalyDetectorsProvider(
      request,
      coreContext.savedObjects.client
    ),
    modules: mlplugin.setup.modulesProvider(
      request,
      coreContext.savedObjects.client
    ),
  };
}
