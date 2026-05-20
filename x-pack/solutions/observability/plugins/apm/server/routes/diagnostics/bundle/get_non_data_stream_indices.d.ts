import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getNonDataStreamIndices({ esClient, apmIndices, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
}): Promise<string[]>;
