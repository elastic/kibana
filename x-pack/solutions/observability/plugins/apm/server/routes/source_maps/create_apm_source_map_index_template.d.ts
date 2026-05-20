import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare function createApmSourceMapIndexTemplate({ client, logger, }: {
    client: ElasticsearchClient;
    logger: Logger;
}): Promise<void>;
export interface ApmSourceMap {
    fleet_id: string;
    created: string;
    content: string;
    content_sha256: string;
    file: {
        path: string;
    };
    service: {
        name: string;
        version: string;
    };
}
