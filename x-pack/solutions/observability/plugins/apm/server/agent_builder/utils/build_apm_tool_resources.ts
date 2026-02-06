/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import { firstValueFrom } from 'rxjs';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import type { MinimalApmPluginRequestHandlerContext } from '../../routes/typings';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';

export interface ApmToolResources {
  apmEventClient: Awaited<ReturnType<typeof getApmEventClient>>;
  apmDataAccessServices: ApmDataAccessServices;
  randomSampler: Awaited<ReturnType<typeof getRandomSampler>>;
  mlClient: Awaited<ReturnType<typeof getMlClient>>;
  apmAlertsClient: ApmAlertsClient;
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
}

export async function buildApmToolResources({
  core,
  plugins,
  request,
  esClient,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  request: KibanaRequest;
  esClient?: IScopedClusterClient;
  logger: Logger;
}): Promise<ApmToolResources> {
  const [coreStart, pluginStart] = await core.getStartServices();
  const esScoped = esClient ?? coreStart.elasticsearch.client.asScoped(request);
  const soClient = coreStart.savedObjects.getScopedClient(request, { includedHiddenTypes: [] });
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);

  const licensingContext = firstValueFrom(pluginStart.licensing.license$).then((license) => ({
    license,
    featureUsage: pluginStart.licensing.featureUsage,
  }));

  const contextAdapter = {
    core: Promise.resolve({
      savedObjects: { client: soClient },
      uiSettings: { client: uiSettingsClient },
      elasticsearch: { client: esScoped },
    }),
    licensing: licensingContext,
  } as unknown as MinimalApmPluginRequestHandlerContext;

  const pluginsAdapter = {
    ml: plugins.ml
      ? {
          setup: plugins.ml,
          start: async () => pluginStart.ml!,
        }
      : undefined,
    ruleRegistry: {
      setup: plugins.ruleRegistry,
      start: async () => pluginStart.ruleRegistry,
    },
  } as unknown as MinimalAPMRouteHandlerResources['plugins'];

  const apmEventClientPromise = getApmEventClient({
    context: contextAdapter,
    request,
    params: {
      query: {
        _inspect: false,
      },
    },
    getApmIndices: async () => {
      return plugins.apmDataAccess.getApmIndices(soClient);
    },
  });

  const randomSamplerPromise = getRandomSampler({
    coreStart,
    request,
    probability: 1,
  });

  const mlClientPromise = getMlClient({
    plugins: pluginsAdapter,
    context: contextAdapter,
    request,
  }).catch(() => undefined);

  const apmAlertsClientPromise = getApmAlertsClient({
    context: contextAdapter,
    plugins: pluginsAdapter,
    request,
  });

  const [apmEventClient, randomSampler, mlClient, apmAlertsClient] = await Promise.all([
    apmEventClientPromise,
    randomSamplerPromise,
    mlClientPromise,
    apmAlertsClientPromise,
  ]);

  const apmDataAccessServices = plugins.apmDataAccess.getServices({ apmEventClient });

  return {
    apmEventClient,
    apmDataAccessServices,
    randomSampler,
    mlClient,
    apmAlertsClient,
    esClient: esScoped,
    soClient,
  };
}
