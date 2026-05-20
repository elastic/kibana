import type { AnnotationType } from '../../../../common/annotations';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getDerivedServiceAnnotations({ apmEventClient, serviceName, environment, searchAggregatedTransactions, start, end, }: {
    serviceName: string;
    environment: string;
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
}): Promise<{
    type: AnnotationType;
    id: string;
    "@timestamp": number;
    text: string;
}[]>;
