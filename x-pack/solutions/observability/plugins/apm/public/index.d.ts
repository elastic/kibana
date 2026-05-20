import type { PluginInitializer } from '@kbn/core/public';
import type { ApmPluginSetup, ApmPluginStart } from './plugin';
export interface ConfigSchema {
    serviceMapEnabled: boolean;
    ui: {
        enabled: boolean;
    };
    latestAgentVersionsUrl: string;
    serverlessOnboarding: boolean;
    managedServiceUrl: string;
    featureFlags: {
        agentConfigurationAvailable: boolean;
        configurableIndicesAvailable: boolean;
        infrastructureTabAvailable: boolean;
        infraUiAvailable: boolean;
        migrationToFleetAvailable: boolean;
        sourcemapApiAvailable: boolean;
        storageExplorerAvailable: boolean;
        profilingIntegrationAvailable: boolean;
        ruleFormV2Enabled: boolean;
    };
    serverless: {
        enabled: boolean;
    };
}
export declare const plugin: PluginInitializer<ApmPluginSetup, ApmPluginStart>;
export type { ApmPluginSetup, ApmPluginStart };
