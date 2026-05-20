import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getIndicesStates({ esClient, apmIndices, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
}): Promise<{
    invalidIndices: {
        isValid: boolean;
        fieldMappings: {
            isValid: boolean;
            invalidType: string | undefined;
        };
        ingestPipeline: {
            isValid: boolean;
            id: string | undefined;
        };
        index: string;
        dataStream: string | undefined;
    }[];
    validIndices: {
        isValid: boolean;
        fieldMappings: {
            isValid: boolean;
            invalidType: string | undefined;
        };
        ingestPipeline: {
            isValid: boolean;
            id: string | undefined;
        };
        index: string;
        dataStream: string | undefined;
    }[];
    indices: import("@elastic/elasticsearch/lib/api/types").IndicesGetResponse;
    ingestPipelines: import("@elastic/elasticsearch/lib/api/types").IngestGetPipelineResponse;
    fieldCaps: import("@elastic/elasticsearch/lib/api/types").FieldCapsResponse;
}>;
export declare function validateIngestPipelineName(dataStream: string | undefined, ingestPipelineId: string | undefined): boolean;
