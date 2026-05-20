import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
export declare function getIndexTemplatesByIndexPattern({ esClient, apmIndices, }: {
    esClient: ElasticsearchClient;
    apmIndices: APMIndices;
}): Promise<never[] | {
    indexPattern: string;
    indexTemplates: {
        isNonStandard: boolean;
        priority: number | undefined;
        templateIndexPatterns: string[];
        templateName: string;
    }[];
}[]>;
