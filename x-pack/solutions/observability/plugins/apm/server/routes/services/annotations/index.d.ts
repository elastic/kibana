import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import type { Annotation } from '../../../../common/annotations';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface ServiceAnnotationResponse {
    annotations: Annotation[];
}
export declare function getServiceAnnotations({ apmEventClient, searchAggregatedTransactions, serviceName, environment, annotationsClient, client, logger, start, end, }: {
    serviceName: string;
    environment: string;
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    annotationsClient?: ScopedAnnotationsClient;
    client: ElasticsearchClient;
    logger: Logger;
    start: number;
    end: number;
}): Promise<{
    annotations: Annotation[];
}>;
