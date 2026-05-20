import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare function createApmAgentConfigurationIndex({ client, logger, }: {
    client: ElasticsearchClient;
    logger: Logger;
}): Promise<void>;
