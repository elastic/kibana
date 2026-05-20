declare const dashboardFileNames: readonly ["classic_apm-apm-nodejs", "classic_apm-edot-nodejs", "classic_apm-otel_other-nodejs", "otel_native-edot-nodejs", "otel_native-otel_other-nodejs", "classic_apm-apm-java", "classic_apm-otel_other-java", "classic_apm-otel_other-dotnet", "classic_apm-edot-java", "otel_native-edot-java", "otel_native-otel_other-java", "classic_apm-edot-dotnet", "classic_apm-edot-dotnet-lte-v8", "otel_native-edot-python", "otel_native-otel_other-python", "classic_apm-otel_other-go", "otel_native-otel_other-go"];
export type DashboardFileName = (typeof dashboardFileNames)[number];
type VersionOperator = '>=' | '<=' | '>' | '<' | '==';
export interface VersionRule {
    condition: `${VersionOperator}${number}`;
    fileName: DashboardFileName;
}
/**
 * Maps a base key (e.g. 'classic_apm-edot-dotnet') to an ordered list of
 * version rules. Rules are evaluated top-to-bottom; first match wins.
 * When no rule matches (or no version is available), the base key entry
 * from dashboardFileNames is used as fallback.
 */
export declare const versionedDashboardRules: Record<string, VersionRule[]>;
export declare const parseVersionCondition: (condition: string) => {
    operator: VersionOperator;
    version: number;
} | undefined;
export declare const evaluateVersionCondition: (condition: string, majorVersion: number) => boolean;
export declare const resolveDashboard: (baseKey: string, majorVersion: number | undefined) => DashboardFileName | undefined;
export declare function loadDashboardFile(filename: DashboardFileName): Promise<{
    default: {
        attributes: {
            description: string;
            kibanaSavedObjectMeta: {
                searchSourceJSON: string;
            };
            optionsJSON: string;
            panelsJSON: string;
            timeRestore: boolean;
            title: string;
            version: number;
        };
        coreMigrationVersion: string;
        created_at: string;
        id: string;
        managed: boolean;
        references: {
            id: string;
            name: string;
            type: string;
        }[];
        type: string;
        typeMigrationVersion: string;
        updated_at: string;
        version: string;
    };
    attributes: {
        description: string;
        kibanaSavedObjectMeta: {
            searchSourceJSON: string;
        };
        optionsJSON: string;
        panelsJSON: string;
        timeRestore: boolean;
        title: string;
        version: number;
    };
    coreMigrationVersion: string;
    created_at: string;
    id: string;
    managed: boolean;
    references: {
        id: string;
        name: string;
        type: string;
    }[];
    type: string;
    typeMigrationVersion: string;
    updated_at: string;
    version: string;
} | {
    default: {
        attributes: {
            controlGroupInput: {
                chainingSystem: string;
                controlStyle: string;
                ignoreParentSettingsJSON: string;
                panelsJSON: string;
                showApplySelections: boolean;
            };
            description: string;
            kibanaSavedObjectMeta: {
                searchSourceJSON: string;
            };
            optionsJSON: string;
            panelsJSON: string;
            timeRestore: boolean;
            title: string;
            version: number;
        };
        coreMigrationVersion: string;
        created_at: string;
        id: string;
        managed: boolean;
        references: {
            id: string;
            name: string;
            type: string;
        }[];
        type: string;
        typeMigrationVersion: string;
        updated_at: string;
        updated_by: string;
        version: string;
    };
    attributes: {
        controlGroupInput: {
            chainingSystem: string;
            controlStyle: string;
            ignoreParentSettingsJSON: string;
            panelsJSON: string;
            showApplySelections: boolean;
        };
        description: string;
        kibanaSavedObjectMeta: {
            searchSourceJSON: string;
        };
        optionsJSON: string;
        panelsJSON: string;
        timeRestore: boolean;
        title: string;
        version: number;
    };
    coreMigrationVersion: string;
    created_at: string;
    id: string;
    managed: boolean;
    references: {
        id: string;
        name: string;
        type: string;
    }[];
    type: string;
    typeMigrationVersion: string;
    updated_at: string;
    updated_by: string;
    version: string;
} | {
    default: {
        attributes: {
            controlGroupInput: {
                chainingSystem: string;
                controlStyle: string;
                ignoreParentSettingsJSON: string;
                panelsJSON: string;
                showApplySelections: boolean;
            };
            description: string;
            kibanaSavedObjectMeta: {
                searchSourceJSON: string;
            };
            optionsJSON: string;
            panelsJSON: string;
            timeRestore: boolean;
            title: string;
            version: number;
        };
        coreMigrationVersion: string;
        created_at: string;
        created_by: string;
        id: string;
        managed: boolean;
        references: {
            id: string;
            name: string;
            type: string;
        }[];
        type: string;
        typeMigrationVersion: string;
        updated_at: string;
        updated_by: string;
        version: string;
    };
    attributes: {
        controlGroupInput: {
            chainingSystem: string;
            controlStyle: string;
            ignoreParentSettingsJSON: string;
            panelsJSON: string;
            showApplySelections: boolean;
        };
        description: string;
        kibanaSavedObjectMeta: {
            searchSourceJSON: string;
        };
        optionsJSON: string;
        panelsJSON: string;
        timeRestore: boolean;
        title: string;
        version: number;
    };
    coreMigrationVersion: string;
    created_at: string;
    created_by: string;
    id: string;
    managed: boolean;
    references: {
        id: string;
        name: string;
        type: string;
    }[];
    type: string;
    typeMigrationVersion: string;
    updated_at: string;
    updated_by: string;
    version: string;
} | undefined>;
export {};
