import * as t from 'io-ts';
export declare enum ApmFeatureFlagName {
    AgentConfigurationAvailable = "agentConfigurationAvailable",
    ConfigurableIndicesAvailable = "configurableIndicesAvailable",
    InfrastructureTabAvailable = "infrastructureTabAvailable",
    InfraUiAvailable = "infraUiAvailable",
    MigrationToFleetAvailable = "migrationToFleetAvailable",
    SourcemapApiAvailable = "sourcemapApiAvailable",
    StorageExplorerAvailable = "storageExplorerAvailable",
    RuleFormV2Enabled = "ruleFormV2Enabled"
}
declare const apmFeatureFlagMap: {
    agentConfigurationAvailable: {
        default: boolean;
        type: t.BooleanC;
    };
    configurableIndicesAvailable: {
        default: boolean;
        type: t.BooleanC;
    };
    infrastructureTabAvailable: {
        default: boolean;
        type: t.BooleanC;
    };
    infraUiAvailable: {
        default: boolean;
        type: t.BooleanC;
    };
    migrationToFleetAvailable: {
        default: boolean;
        type: t.BooleanC;
    };
    sourcemapApiAvailable: {
        default: boolean;
        type: t.BooleanC;
    };
    storageExplorerAvailable: {
        default: boolean;
        type: t.BooleanC;
    };
    ruleFormV2Enabled: {
        default: boolean;
        type: t.BooleanC;
    };
};
type ApmFeatureFlagMap = typeof apmFeatureFlagMap;
export type ApmFeatureFlags = {
    [TApmFeatureFlagName in keyof ApmFeatureFlagMap]: ValueOfApmFeatureFlag<TApmFeatureFlagName>;
};
export type ValueOfApmFeatureFlag<TApmFeatureFlagName extends ApmFeatureFlagName> = t.OutputOf<ApmFeatureFlagMap[TApmFeatureFlagName]['type']>;
export declare function getApmFeatureFlags(): ApmFeatureFlags;
export {};
