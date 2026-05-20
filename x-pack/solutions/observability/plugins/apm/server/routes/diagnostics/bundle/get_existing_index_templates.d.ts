import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export type ApmIndexTemplateStates = Record<string, {
    exists: boolean;
    name?: string | undefined;
}>;
export declare function getExistingApmIndexTemplates({ esClient, }: {
    esClient: ElasticsearchClient;
}): Promise<import("@elastic/elasticsearch/lib/api/types").IndicesGetIndexTemplateIndexTemplateItem[]>;
