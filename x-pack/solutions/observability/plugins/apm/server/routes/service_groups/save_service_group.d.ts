import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SavedServiceGroup, ServiceGroup } from '../../../common/service_groups';
interface Options {
    savedObjectsClient: SavedObjectsClientContract;
    serviceGroupId?: string;
    serviceGroup: ServiceGroup;
}
export declare function saveServiceGroup({ savedObjectsClient, serviceGroupId, serviceGroup, }: Options): Promise<SavedServiceGroup>;
export {};
