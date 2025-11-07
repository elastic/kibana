/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import { searchExcludedDataTiers } from '@kbn/observability-plugin/common/ui_settings_keys';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { hasHistoricalAgentData } from '../../routes/historical_data/has_historical_agent_data';

export interface ApmToolResources {
  apmEventClient: APMEventClient;
  randomSampler: Awaited<ReturnType<typeof getRandomSampler>>;
  hasHistoricalData: boolean;
}

export async function buildApmToolResources({
  core,
  plugins,
  request,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  request: KibanaRequest;
  logger: Logger;
}): Promise<ApmToolResources> {
  const [coreStart] = await core.getStartServices();

  const soClient = coreStart.savedObjects.getScopedClient(request, { includedHiddenTypes: [] });
  const apmIndices = await plugins.apmDataAccess.getApmIndices(soClient);

  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
  const [includeFrozen, excludedDataTiers] = await Promise.all([
    uiSettingsClient.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
    uiSettingsClient.get<DataTier[]>(searchExcludedDataTiers),
  ]);

  const esScoped = coreStart.elasticsearch.client.asScoped(request);
  const apmEventClient = new APMEventClient({
    esClient: esScoped.asCurrentUser,
    debug: false,
    request,
    indices: apmIndices,
    options: {
      includeFrozen,
      excludedDataTiers,
    },
  });

  const randomSampler = await getRandomSampler({
    coreStart,
    request,
    probability: 1,
  });

  const hasHistoricalData = await hasHistoricalAgentData(apmEventClient as any);

  return { apmEventClient, randomSampler, hasHistoricalData };
}
