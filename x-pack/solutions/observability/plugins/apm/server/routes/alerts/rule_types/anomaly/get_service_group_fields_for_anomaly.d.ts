import type { IScopedClusterClient, IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getServiceGroupFieldsForAnomaly({ apmIndices, scopedClusterClient, serviceName, uiSettingsClient, environment, transactionType, timestamp, bucketSpan, }: {
    apmIndices: APMIndices;
    scopedClusterClient: IScopedClusterClient;
    savedObjectsClient: SavedObjectsClientContract;
    uiSettingsClient: IUiSettingsClient;
    serviceName: string;
    environment: string;
    transactionType: string;
    timestamp: number;
    bucketSpan: number;
}): Promise<Record<string, string | object>>;
