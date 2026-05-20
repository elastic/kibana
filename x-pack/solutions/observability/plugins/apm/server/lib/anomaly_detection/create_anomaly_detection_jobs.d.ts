import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { Environment } from '../../../common/environment_rt';
import type { MlClient } from '../helpers/get_ml_client';
export declare function createAnomalyDetectionJobs({ mlClient, esClient, indices, environments, logger, esCapabilities, }: {
    mlClient?: MlClient;
    esClient: ElasticsearchClient;
    indices: APMIndices;
    environments: Environment[];
    logger: Logger;
    esCapabilities: ElasticsearchCapabilities;
}): Promise<import("@kbn/ml-common-types/modules").JobResponse[]>;
