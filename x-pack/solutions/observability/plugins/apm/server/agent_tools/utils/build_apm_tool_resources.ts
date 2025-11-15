/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { hasHistoricalAgentData } from '../../routes/historical_data/has_historical_agent_data';
import type { MinimalApmPluginRequestHandlerContext } from '../../routes/typings';

export interface ApmToolResources {
  apmEventClient: Awaited<ReturnType<typeof getApmEventClient>>;
  randomSampler: Awaited<ReturnType<typeof getRandomSampler>>;
  hasHistoricalData: boolean;
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
  const [coreStart] = await core.getStartServices();
  const esScoped = esClient ?? coreStart.elasticsearch.client.asScoped(request);
  const soClient = coreStart.savedObjects.getScopedClient(request, { includedHiddenTypes: [] });
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);

  const contextAdapter = {
    core: Promise.resolve({
      savedObjects: { client: soClient },
      uiSettings: { client: uiSettingsClient },
      elasticsearch: { client: esScoped },
    }),
  } as unknown as MinimalApmPluginRequestHandlerContext;

  const [apmEventClient, randomSampler] = await Promise.all([
    getApmEventClient({
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
    }),
    getRandomSampler({
      coreStart,
      request,
      probability: 1,
    }),
  ]);

  const hasHistoricalData = await hasHistoricalAgentData(apmEventClient);
  logger.debug(`Has historical data: ${hasHistoricalData}`);

  return { apmEventClient, randomSampler, hasHistoricalData };
}
