import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { KeyValuePair } from '@kbn/key-value-metadata-table';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface LogCategory {
    errorCategory: string;
    docCount: number;
    sampleMessage: string;
    downstreamServiceResource?: string;
}
export declare function getLogCategories({ apmEventClient, esClient, logSourcesService, arguments: args, }: {
    apmEventClient: APMEventClient;
    esClient: ElasticsearchClient;
    logSourcesService: LogSourcesService;
    arguments: {
        start: string;
        end: string;
        entities: {
            'service.name'?: string;
            'host.name'?: string;
            'container.id'?: string;
            'kubernetes.pod.name'?: string;
        };
    };
}): Promise<{
    logCategories: LogCategory[];
    entities: KeyValuePair[];
}>;
