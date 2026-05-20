import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { RegistrationCallback, RegisterFunction } from '@kbn/observability-ai-assistant-plugin/server/service/types';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { APMConfig } from '..';
import type { ApmFeatureFlags } from '../../common/apm_feature_flags';
import type { APMEventClient } from '../lib/helpers/create_es_client/create_apm_event_client';
import type { APMRouteHandlerResources, MinimalAPMRouteHandlerResources } from '../routes/apm_routes/register_apm_server_routes';
export interface FunctionRegistrationParameters {
    apmEventClient: APMEventClient;
    registerFunction: RegisterFunction;
    resources: MinimalAPMRouteHandlerResources;
}
export declare function registerAssistantFunctions({ coreSetup, config, featureFlags, logger, kibanaVersion, ruleDataClient, plugins, }: {
    coreSetup: CoreSetup;
    config: APMConfig;
    featureFlags: ApmFeatureFlags;
    logger: Logger;
    kibanaVersion: string;
    ruleDataClient: IRuleDataClient;
    plugins: APMRouteHandlerResources['plugins'];
}): RegistrationCallback;
