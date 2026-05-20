import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { SearchAggregatedTransactionSetting } from '../common/aggregated_transactions';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    autoCreateApmDataView: import("@kbn/config-schema").Type<boolean>;
    serviceMapEnabled: import("@kbn/config-schema").Type<boolean>;
    serviceMapFingerprintBucketSize: import("@kbn/config-schema").Type<number>;
    serviceMapFingerprintGlobalBucketSize: import("@kbn/config-schema").Type<number>;
    serviceMapMaxAllowableBytes: import("@kbn/config-schema").Type<number>;
    serviceMapTraceIdBucketSize: import("@kbn/config-schema").Type<number>;
    serviceMapTraceIdGlobalBucketSize: import("@kbn/config-schema").Type<number>;
    serviceMapMaxTracesPerRequest: import("@kbn/config-schema").Type<number>;
    serviceMapTerminateAfter: import("@kbn/config-schema").Type<number>;
    serviceMapMaxTraces: import("@kbn/config-schema").Type<number>;
    ui: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").Type<boolean>;
        maxTraceItems: import("@kbn/config-schema").Type<number>;
    }>;
    searchAggregatedTransactions: import("@kbn/config-schema").Type<SearchAggregatedTransactionSetting>;
    telemetryCollectionEnabled: import("@kbn/config-schema").Type<boolean>;
    metricsInterval: import("@kbn/config-schema").Type<number>;
    agent: import("@kbn/config-schema").ObjectType<{
        migrations: import("@kbn/config-schema").ObjectType<{
            enabled: import("@kbn/config-schema").Type<boolean>;
        }>;
    }>;
    forceSyntheticSource: import("@kbn/config-schema").Type<boolean>;
    latestAgentVersionsUrl: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    serverlessOnboarding: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    managedServiceUrl: import("@kbn/config-schema").ConditionalType<true, string, string>;
    managedOtlpServiceUrl: import("@kbn/config-schema").ConditionalType<true, string, string>;
    featureFlags: import("@kbn/config-schema").ObjectType<{
        agentConfigurationAvailable: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        configurableIndicesAvailable: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        infrastructureTabAvailable: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        infraUiAvailable: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        migrationToFleetAvailable: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        sourcemapApiAvailable: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        storageExplorerAvailable: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
        profilingIntegrationAvailable: import("@kbn/config-schema").Type<boolean>;
        ruleFormV2Enabled: import("@kbn/config-schema").Type<boolean>;
    }>;
    serverless: import("@kbn/config-schema").ObjectType<{
        enabled: import("@kbn/config-schema").ConditionalType<true, true, true>;
    }>;
}>;
export declare const config: PluginConfigDescriptor<APMConfig>;
export type APMConfig = TypeOf<typeof configSchema>;
export declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").APMPlugin>;
export { APM_SERVER_FEATURE_ID } from '../common/rules/apm_rule_types';
export type { APMPluginSetup } from './types';
export type { APMServerRouteRepository, APIEndpoint, } from './routes/apm_routes/get_global_apm_server_route_repository';
