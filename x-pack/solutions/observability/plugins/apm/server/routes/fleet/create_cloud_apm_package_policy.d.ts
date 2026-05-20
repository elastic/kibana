import type { ElasticsearchClient, SavedObjectsClientContract, Logger, KibanaRequest } from '@kbn/core/server';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import type { APMInternalESClient } from '../../lib/helpers/create_es_client/create_internal_es_client';
export declare function createCloudApmPackgePolicy({ cloudPluginSetup, fleetPluginStart, savedObjectsClient, esClient, logger, internalESClient, request, apmIndices, }: {
    cloudPluginSetup: APMPluginSetupDependencies['cloud'];
    fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
    savedObjectsClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    logger: Logger;
    internalESClient: APMInternalESClient;
    request: KibanaRequest;
    apmIndices: APMIndices;
}): Promise<PackagePolicy>;
