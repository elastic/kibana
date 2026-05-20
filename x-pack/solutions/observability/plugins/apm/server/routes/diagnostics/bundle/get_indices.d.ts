import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getApmIndexPatterns(indices: string[]): string[];
export declare function getIndicesAndIngestPipelines({ esClient, apmIndices, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
}): Promise<{
    indices: import("@elastic/elasticsearch/lib/api/types").IndicesGetResponse;
    ingestPipelines: import("@elastic/elasticsearch/lib/api/types").IngestGetPipelineResponse;
}>;
