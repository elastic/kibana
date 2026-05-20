import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedServiceGroup } from '../../../common/service_groups';
export declare function getServiceGroups({ savedObjectsClient, }: {
    savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedServiceGroup[]>;
