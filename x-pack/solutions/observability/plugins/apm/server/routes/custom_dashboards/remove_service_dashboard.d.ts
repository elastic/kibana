import type { SavedObjectsClientContract } from '@kbn/core/server';
interface Options {
    savedObjectsClient: SavedObjectsClientContract;
    customDashboardId: string;
}
export declare function deleteServiceDashboard({ savedObjectsClient, customDashboardId }: Options): Promise<{}>;
export {};
