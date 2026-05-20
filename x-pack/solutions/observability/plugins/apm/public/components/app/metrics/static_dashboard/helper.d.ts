import type { DataView } from '@kbn/data-views-plugin/common';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/public';
import type { DashboardFileName } from './dashboards/dashboard_catalog';
interface DashboardFileProps {
    agentName?: string;
    runtimeName?: string;
    runtimeVersion?: string;
    serverlessType?: string;
    telemetrySdkName?: string;
    telemetrySdkLanguage?: string;
}
export interface MetricsDashboardProps extends DashboardFileProps {
    dataView: DataView;
    apmIndices?: APMIndices;
}
export declare function getDashboardFileNameFromProps({ agentName, telemetrySdkName, telemetrySdkLanguage, runtimeVersion, }: DashboardFileProps): DashboardFileName | undefined;
export declare function hasDashboard(props: DashboardFileProps): boolean;
export declare function getMetricIndexPattern(dashboardFilename: DashboardFileName, apmIndices: APMIndices | undefined, dataView: DataView): string;
export declare function convertSavedDashboardToPanels(props: MetricsDashboardProps): Promise<DashboardState['panels'] | undefined>;
export {};
