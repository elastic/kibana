import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare const createApmCustomLinkIndex: ({ client, logger, }: {
    client: ElasticsearchClient;
    logger: Logger;
}) => Promise<void>;
