import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedServiceGroup } from '../../../common/service_groups';
export declare function getServiceGroup({ savedObjectsClient, serviceGroupId, }: {
    savedObjectsClient: SavedObjectsClientContract;
    serviceGroupId: string;
}): Promise<SavedServiceGroup>;
