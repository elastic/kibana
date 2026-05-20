import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getFieldCaps({ esClient, apmIndices, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
}): Promise<import("@elastic/elasticsearch/lib/api/types").FieldCapsResponse>;
