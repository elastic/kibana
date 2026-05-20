import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedApmCustomDashboard, ApmCustomDashboard } from '../../../common/custom_dashboards';
interface Options {
    savedObjectsClient: SavedObjectsClientContract;
    customDashboardId?: string;
    serviceDashboard: ApmCustomDashboard;
}
export declare function saveServiceDashbord({ savedObjectsClient, customDashboardId, serviceDashboard, }: Options): Promise<SavedApmCustomDashboard>;
export {};
