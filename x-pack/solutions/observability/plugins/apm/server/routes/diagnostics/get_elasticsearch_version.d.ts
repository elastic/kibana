import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function getElasticsearchVersion(esClient: ElasticsearchClient): Promise<string>;
