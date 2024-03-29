/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type {
  RegistrationCallback,
  RegisterFunction,
} from '@kbn/observability-ai-assistant-plugin/server/service/types';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
// import type { APMConfig } from '..';
// import type { ApmFeatureFlags } from '../../common/apm_feature_flags';
// import { APMEventClient } from '../lib/helpers/create_es_client/create_apm_event_client';
// import { getApmEventClient } from '../lib/helpers/get_apm_event_client';
// import type { APMRouteHandlerResources } from '../routes/apm_routes/register_apm_server_routes';
// import { hasHistoricalAgentData } from '../routes/historical_data/has_historical_agent_data';
import { registerGetAiopsLogRateAnalysisFunction } from './get_aiops_log_rate_analysis_function';

export interface FunctionRegistrationParameters {
  apmEventClient: any; // APMEventClient;
  registerFunction: RegisterFunction;
  resources: any; // APMRouteHandlerResources;
}

export function registerAssistantFunctions({
  coreSetup,
  config,
  featureFlags,
  logger,
  kibanaVersion,
  ruleDataClient,
  plugins,
}: {
  coreSetup: CoreSetup;
  config: any; // APMConfig;
  featureFlags: any; // ApmFeatureFlags;
  logger: Logger;
  kibanaVersion: string;
  ruleDataClient: IRuleDataClient;
  plugins: any; // APMRouteHandlerResources['plugins'];
}): RegistrationCallback {
  return async ({ resources, functions: { registerContext, registerFunction } }) => {
    // const apmRouteHandlerResources: APMRouteHandlerResources = {
    //   context: resources.context,
    //   request: resources.request,
    //   core: {
    //     setup: coreSetup,
    //     start: () => coreSetup.getStartServices().then(([coreStart]) => coreStart),
    //   },
    //   params: {
    //     query: {
    //       _inspect: false,
    //     },
    //   },
    //   config,
    //   featureFlags,
    //   logger,
    //   kibanaVersion,
    //   ruleDataClient,
    //   plugins,
    //   getApmIndices: async () => {
    //     const coreContext = await resources.context.core;
    //     const apmIndices = await plugins.apmDataAccess.setup.getApmIndices(
    //       coreContext.savedObjects.client
    //     );
    //     return apmIndices;
    //   },
    // };

    // const apmEventClient = await getApmEventClient(apmRouteHandlerResources);

    // const hasData = await hasHistoricalAgentData(apmEventClient);

    // if (!hasData) {
    //   return;
    // }

    const esClient = await (await resources.context.core).elasticsearch.client.asCurrentUser;

    const parameters: FunctionRegistrationParameters = {
      resources: { esClient },
      apmEventClient: {},
      registerFunction,
    };

    registerGetAiopsLogRateAnalysisFunction(parameters);

    registerContext({
      name: 'aiops',
      description: ``,
    });
  };
}
