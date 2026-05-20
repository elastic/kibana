import type { PluginSetupContract as AlertingPluginPublicSetup, PluginStartContract as AlertingPluginPublicStart } from '@kbn/alerting-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { ApplicationStart, CoreSetup, CoreStart, NotificationsStart, Plugin, PluginInitializerContext, SecurityServiceStart } from '@kbn/core/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { ExploratoryViewPublicSetup } from '@kbn/exploratory-view-plugin/public';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FleetStart } from '@kbn/fleet-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { MetricsDataPluginStart } from '@kbn/metrics-data-access-plugin/public';
import type { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { ObservabilityAIAssistantPublicSetup, ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { ObservabilityPublicSetup, ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import type { ObservabilitySharedPluginSetup, ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { ProfilingPluginSetup, ProfilingPluginStart } from '@kbn/profiling-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TriggersAndActionsUIPublicPluginSetup, TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { LogsSharedClientStartExports } from '@kbn/logs-shared-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ObservabilityAgentBuilderPluginPublicStart } from '@kbn/observability-agent-builder-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { DiscoverSharedPublicSetup, DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { KqlPluginSetup, KqlPluginStart } from '@kbn/kql/public';
import type { SLOPublicStart } from '@kbn/slo-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { ICPSManager } from '@kbn/cps-utils';
import type { ConfigSchema } from '.';
import type { ITelemetryClient } from './services/telemetry';
export type ApmPluginSetup = ReturnType<ApmPlugin['setup']>;
export type ApmPluginStart = ReturnType<ApmPlugin['start']>;
export interface ApmPluginSetupDeps {
    alerting?: AlertingPluginPublicSetup;
    data: DataPublicPluginSetup;
    discover?: DiscoverSetup;
    embeddable: EmbeddableSetup;
    exploratoryView: ExploratoryViewPublicSetup;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginSetup;
    features: FeaturesPluginSetup;
    home?: HomePublicPluginSetup;
    licenseManagement?: LicenseManagementUIPluginSetup;
    ml?: MlPluginSetup;
    observability: ObservabilityPublicSetup;
    observabilityShared: ObservabilitySharedPluginSetup;
    observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
    triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
    share: SharePluginSetup;
    uiActions: UiActionsSetup;
    profiling?: ProfilingPluginSetup;
    cloud?: CloudSetup;
    discoverShared: DiscoverSharedPublicSetup;
}
export interface ApmServices {
    securityService: SecurityServiceStart;
    telemetry: ITelemetryClient;
}
export interface ApmInternalServices {
    cpsManager?: ICPSManager;
}
export declare const getApmInternalServices: import("@kbn/kibana-utils-plugin/public").Get<ApmInternalServices>, setApmInternalServices: import("@kbn/kibana-utils-plugin/public").Set<ApmInternalServices>;
export interface ApmPluginStartDeps {
    alerting?: AlertingPluginPublicStart;
    application: ApplicationStart;
    cases?: CasesPublicStart;
    charts?: ChartsPluginStart;
    data: DataPublicPluginStart;
    discover?: DiscoverStart;
    embeddable: EmbeddableStart;
    home: void;
    inspector: InspectorPluginStart;
    licensing: LicensingPluginStart;
    maps?: MapsStartApi;
    ml?: MlPluginStart;
    triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
    observability: ObservabilityPublicStart;
    observabilityShared: ObservabilitySharedPluginStart;
    observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
    fleet?: FleetStart;
    fieldFormats: FieldFormatsStart;
    security?: SecurityPluginStart;
    settings: SettingsStart;
    spaces?: SpacesPluginStart;
    serverless?: ServerlessPluginStart;
    dataViews: DataViewsPublicPluginStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    storage: IStorageWrapper;
    lens: LensPublicStart;
    uiActions: UiActionsStart;
    profiling?: ProfilingPluginStart;
    dashboard: DashboardStart;
    metricsDataAccess: MetricsDataPluginStart;
    uiSettings: IUiSettingsClient;
    logsShared: LogsSharedClientStartExports;
    logsDataAccess: LogsDataAccessPluginStart;
    apmSourcesAccess: ApmSourceAccessPluginStart;
    savedSearch: SavedSearchPublicPluginStart;
    fieldsMetadata: FieldsMetadataPublicStart;
    share?: SharePublicStart;
    notifications: NotificationsStart;
    discoverShared: DiscoverSharedPublicStart;
    agentBuilder?: AgentBuilderPluginStart;
    observabilityAgentBuilder?: ObservabilityAgentBuilderPluginPublicStart;
    slo?: SLOPublicStart;
    cps?: CPSPluginStart;
}
export declare class ApmPlugin implements Plugin<ApmPluginSetup, ApmPluginStart> {
    private readonly initializerContext;
    private telemetry;
    private kibanaVersion;
    private isServerlessEnv;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup, plugins: ApmPluginSetupDeps): {
        locator: import("@kbn/share-plugin/public").LocatorPublic<{
            serviceName: undefined;
        } | ({
            serviceName: string;
        } & {
            dashboardId: string;
        } & {
            query: {
                environment: string | import("io-ts").Branded<string, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            };
        }) | ({
            serviceName: string;
        } & {
            dashboardId?: undefined;
        } & {
            serviceOverviewTab?: "metrics" | "logs" | "errors" | "traces" | "transactions" | undefined;
            errorGroupId?: string | undefined;
        } & {
            query: {
                environment: string | import("io-ts").Branded<string, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
            } & {
                kuery?: string | undefined;
                rangeFrom?: string | undefined;
                rangeTo?: string | undefined;
            };
        })>;
    };
    start(core: CoreStart, plugins: ApmPluginStartDeps): void;
}
