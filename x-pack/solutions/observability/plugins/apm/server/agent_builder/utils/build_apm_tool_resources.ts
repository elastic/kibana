/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ApmDataAccessServices } from '@kbn/apm-data-access-plugin/server';
import { firstValueFrom } from 'rxjs';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import type { MinimalApmPluginRequestHandlerContext } from '../../routes/typings';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmSloClient } from '../../lib/helpers/get_apm_slo_client';
import type { ApmSloClient } from '../../lib/helpers/get_apm_slo_client';
import { getRandomSamplerSeed } from '../../lib/helpers/get_random_sampler';

export interface ApmToolResources {
  apmEventClient: Awaited<ReturnType<typeof getApmEventClient>>;
  apmDataAccessServices: ApmDataAccessServices;
  randomSamplerSeed: number;
  mlClient: Awaited<ReturnType<typeof getMlClient>>;
  apmAlertsClient: ApmAlertsClient;
  /** SLO client; undefined when the SLO plugin is not available. */
  sloClient: ApmSloClient | undefined;
  esClient: IScopedClusterClient;
  soClient: SavedObjectsClientContract;
}

/** What the tool resources use of Core's setup: a way to reach the start services. */
export type ApmToolCore = Pick<CoreSetup<APMPluginStartDependencies>, 'getStartServices'>;

/** The setup contracts of other plugins the tool resources use. */
export type ApmToolPlugins = Pick<
  APMPluginSetupDependencies,
  'apmDataAccess' | 'ml' | 'ruleRegistry' | 'slo'
>;

export async function buildApmToolResources({
  core,
  plugins,
  request,
  esClient,
}: {
  core: ApmToolCore;
  plugins: ApmToolPlugins;
  request: KibanaRequest;
  esClient?: IScopedClusterClient;
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
    slo: plugins.slo
      ? {
          setup: plugins.slo,
          start: async () => pluginStart.slo,
        }
      : undefined,
  } as unknown as MinimalAPMRouteHandlerResources['plugins'];

  const apmEventClientPromise = getApmEventClient({
    context: contextAdapter,
    core: {
      setup: core as unknown as CoreSetup,
      start: () => core.getStartServices().then(([cs]) => cs),
    },
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

  const randomSamplerSeed = getRandomSamplerSeed(coreStart, request);

  const mlClientPromise = getMlClient({
    plugins: pluginsAdapter,
    context: contextAdapter,
    request,
  }).catch(() => undefined);

  // Created on first use: a provider that does not read alerts must not fail where alerts cannot
  // be read (no alert indices, or a task pod, which has no alerts client).
  let alertsClientPromise: ReturnType<typeof getApmAlertsClient> | undefined;
  const apmAlertsClient: ApmAlertsClient = {
    search: (async (searchParams: Parameters<ApmAlertsClient['search']>[0]) => {
      alertsClientPromise ??= getApmAlertsClient({
        context: contextAdapter,
        plugins: pluginsAdapter,
        request,
      });
      return (await alertsClientPromise).search(searchParams);
    }) as ApmAlertsClient['search'],
  };

  // SLO client degrades gracefully to undefined when the SLO plugin is absent.
  const sloClientPromise = getApmSloClient({
    plugins: pluginsAdapter,
    request,
  }).catch(() => undefined);

  const [apmEventClient, mlClient, sloClient] = await Promise.all([
    apmEventClientPromise,
    mlClientPromise,
    sloClientPromise,
  ]);

  const apmDataAccessServices = plugins.apmDataAccess.getServices({ apmEventClient });

  return {
    apmEventClient,
    apmDataAccessServices,
    randomSamplerSeed,
    mlClient,
    apmAlertsClient,
    sloClient,
    esClient: esScoped,
    soClient,
  };
}
