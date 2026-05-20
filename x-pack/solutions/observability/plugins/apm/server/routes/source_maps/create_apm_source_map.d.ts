import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { SourceMap } from './route';
export declare function createApmSourceMap({ internalESClient, logger, fleetId, created, sourceMapContent, bundleFilepath, serviceName, serviceVersion, }: {
    internalESClient: ElasticsearchClient;
    logger: Logger;
    fleetId: string;
    created: string;
    sourceMapContent: SourceMap;
    bundleFilepath: string;
    serviceName: string;
    serviceVersion: string;
}): Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
