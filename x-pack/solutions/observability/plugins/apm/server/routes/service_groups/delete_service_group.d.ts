import type { SavedObjectsClientContract } from '@kbn/core/server';
interface Options {
    savedObjectsClient: SavedObjectsClientContract;
    serviceGroupId: string;
}
export declare function deleteServiceGroup({ savedObjectsClient, serviceGroupId }: Options): Promise<{}>;
export {};
