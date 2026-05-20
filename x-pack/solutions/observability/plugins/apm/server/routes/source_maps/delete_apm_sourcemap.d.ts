import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function deleteApmSourceMap({ internalESClient, fleetId, }: {
    internalESClient: ElasticsearchClient;
    fleetId: string;
}): Promise<import("@elastic/elasticsearch/lib/api/types").DeleteByQueryResponse>;
