import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getDiagnosticsBundle({ esClient, apmIndices, start, end, kuery, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
    start: number | undefined;
    end: number | undefined;
    kuery: string | undefined;
}): Promise<{
    created_at: string;
    diagnosticsPrivileges: {
        index: Record<string, import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesPrivileges>;
        cluster: Record<string, boolean>;
        hasAllIndexPrivileges: boolean;
        hasAllClusterPrivileges: boolean;
        hasAllPrivileges: boolean;
    };
    apmIndices: Readonly<{} & {
        error: string;
        span: string;
        onboarding: string;
        metric: string;
        transaction: string;
        sourcemap: string;
    }>;
    elasticsearchVersion: string;
    esResponses: {
        fieldCaps: import("@elastic/elasticsearch/lib/api/types").FieldCapsResponse | undefined;
        indices: import("@elastic/elasticsearch/lib/api/types").IndicesGetResponse | undefined;
        ingestPipelines: import("@elastic/elasticsearch/lib/api/types").IngestGetPipelineResponse | undefined;
        existingIndexTemplates: import("@elastic/elasticsearch/lib/api/types").IndicesGetIndexTemplateIndexTemplateItem[];
    };
    apmIndexTemplates: {
        name: string;
        exists: boolean;
        isNonStandard: boolean;
    }[];
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
    }[] | undefined;
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
    }[] | undefined;
    indexTemplatesByIndexPattern: {
        indexPattern: string;
        indexTemplates: {
            isNonStandard: boolean;
            priority: number | undefined;
            templateIndexPatterns: string[];
            templateName: string;
        }[];
    }[];
    dataStreams: import("@elastic/elasticsearch/lib/api/types").IndicesDataStream[];
    nonDataStreamIndices: string[];
    apmEvents: import("./bundle/get_apm_events").ApmEvent[];
    params: {
        start: number;
        end: number;
        kuery: string | undefined;
    };
}>;
