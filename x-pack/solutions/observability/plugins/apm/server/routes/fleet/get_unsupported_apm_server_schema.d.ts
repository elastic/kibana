import type { SavedObjectsClientContract } from '@kbn/core/server';
export type UnsupportedApmServerSchema = Array<{
    key: string;
    value: unknown;
}>;
export declare function getUnsupportedApmServerSchema({ savedObjectsClient, }: {
    savedObjectsClient: SavedObjectsClientContract;
}): Promise<UnsupportedApmServerSchema>;
