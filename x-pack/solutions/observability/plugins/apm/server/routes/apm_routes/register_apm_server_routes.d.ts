import type { Logger, KibanaRequest } from '@kbn/core/server';
import type { ServerRouteRepository } from '@kbn/server-route-repository';
import type { InspectResponse } from '@kbn/observability-plugin/typings/common';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ApmFeatureFlags } from '../../../common/apm_feature_flags';
import type { APMCore, MinimalApmPluginRequestHandlerContext, TelemetryUsageCounter } from '../typings';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { APMConfig } from '../..';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
export declare const inspectableEsQueriesMap: WeakMap<KibanaRequest<unknown, unknown, unknown, any>, InspectResponse>;
export declare function registerRoutes({ core, featureFlags, repository, plugins, logger, config, ruleDataClient, telemetryUsageCounter, kibanaVersion, }: {
    core: APMRouteHandlerResources['core'];
    featureFlags: APMRouteHandlerResources['featureFlags'];
    plugins: APMRouteHandlerResources['plugins'];
    logger: APMRouteHandlerResources['logger'];
    repository: ServerRouteRepository;
    config: APMRouteHandlerResources['config'];
    ruleDataClient: APMRouteHandlerResources['ruleDataClient'];
    telemetryUsageCounter?: TelemetryUsageCounter;
    kibanaVersion: string;
}): void;
type Plugins = {
    [key in keyof APMPluginSetupDependencies]: {
        setup: Required<APMPluginSetupDependencies>[key];
        start: () => Promise<Required<APMPluginStartDependencies>[key]>;
    };
};
export type MinimalAPMRouteHandlerResources = Omit<APMRouteHandlerResources, 'context'> & {
    context: MinimalApmPluginRequestHandlerContext;
};
export interface APMRouteHandlerResources {
    request: KibanaRequest;
    context: ApmPluginRequestHandlerContext;
    params: {
        query: {
            _inspect: boolean;
        };
    };
    config: APMConfig;
    featureFlags: ApmFeatureFlags;
    logger: Logger;
    core: APMCore;
    plugins: Plugins;
    ruleDataClient: IRuleDataClient;
    telemetryUsageCounter?: TelemetryUsageCounter;
    kibanaVersion: string;
    getApmIndices: () => Promise<APMIndices>;
}
export {};
