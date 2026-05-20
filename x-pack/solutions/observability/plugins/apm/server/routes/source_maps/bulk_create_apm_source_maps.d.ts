import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Artifact } from '@kbn/fleet-plugin/server';
export declare function bulkCreateApmSourceMaps({ artifacts, internalESClient, }: {
    artifacts: Artifact[];
    internalESClient: ElasticsearchClient;
}): Promise<import("@elastic/elasticsearch/lib/api/types").BulkResponse>;
