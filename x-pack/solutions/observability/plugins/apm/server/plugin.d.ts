import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { APMPluginSetup, APMPluginSetupDependencies, APMPluginStartDependencies } from './types';
export declare class APMPlugin implements Plugin<APMPluginSetup, void, APMPluginSetupDependencies, APMPluginStartDependencies> {
    private readonly initContext;
    private currentConfig?;
    private logger?;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<APMPluginStartDependencies>, plugins: APMPluginSetupDependencies): {
        config$: import("rxjs").Observable<Readonly<{} & {
            agent: Readonly<{} & {
                migrations: Readonly<{} & {
                    enabled: boolean;
                }>;
            }>;
            featureFlags: Readonly<{} & {
                ruleFormV2Enabled: boolean;
                agentConfigurationAvailable: boolean;
                configurableIndicesAvailable: boolean;
                infrastructureTabAvailable: boolean;
                infraUiAvailable: boolean;
                migrationToFleetAvailable: boolean;
                sourcemapApiAvailable: boolean;
                storageExplorerAvailable: boolean;
                profilingIntegrationAvailable: boolean;
            }>;
            serverless: Readonly<{} & {
                enabled: true;
            }>;
            enabled: boolean;
            ui: Readonly<{} & {
                enabled: boolean;
                maxTraceItems: number;
            }>;
            managedOtlpServiceUrl: string;
            autoCreateApmDataView: boolean;
            serviceMapEnabled: boolean;
            serviceMapFingerprintBucketSize: number;
            serviceMapFingerprintGlobalBucketSize: number;
            serviceMapMaxAllowableBytes: number;
            serviceMapTraceIdBucketSize: number;
            serviceMapTraceIdGlobalBucketSize: number;
            serviceMapMaxTracesPerRequest: number;
            serviceMapTerminateAfter: number;
            serviceMapMaxTraces: number;
            searchAggregatedTransactions: import("../common/aggregated_transactions").SearchAggregatedTransactionSetting;
            telemetryCollectionEnabled: boolean;
            metricsInterval: number;
            forceSyntheticSource: boolean;
            latestAgentVersionsUrl: string;
            serverlessOnboarding: boolean;
            managedServiceUrl: string;
        }>>;
    };
    start(core: CoreStart, plugins: APMPluginStartDependencies): void;
    stop(): void;
}
