import type { IndicesGetIndexTemplateRequest, IndicesGetIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare function getIndexTemplate(esClient: ElasticsearchClient, params: IndicesGetIndexTemplateRequest): Promise<IndicesGetIndexTemplateResponse>;
