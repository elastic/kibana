import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedApmCustomDashboard } from '../../../common/custom_dashboards';
interface Props {
    savedObjectsClient: SavedObjectsClientContract;
}
export declare function getCustomDashboards({ savedObjectsClient, }: Props): Promise<SavedApmCustomDashboard[]>;
export {};
