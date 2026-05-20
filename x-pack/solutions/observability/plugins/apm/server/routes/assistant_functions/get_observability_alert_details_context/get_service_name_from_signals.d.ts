import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type * as t from 'io-ts';
import type { alertDetailsContextRt } from '@kbn/observability-plugin/server/services';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getServiceNameFromSignals({ query, esClient, logSourcesService, apmEventClient, }: {
    query: t.TypeOf<typeof alertDetailsContextRt>;
    esClient: ElasticsearchClient;
    logSourcesService: LogSourcesService;
    apmEventClient: APMEventClient;
}): Promise<string | undefined>;
