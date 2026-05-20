import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
export declare function updateToV3({ logger, indices, mlClient, esClient, esCapabilities, }: {
    logger: Logger;
    mlClient?: MlClient;
    indices: APMIndices;
    esClient: ElasticsearchClient;
    esCapabilities: ElasticsearchCapabilities;
}): Promise<boolean>;
