import type { Transaction } from '@kbn/apm-types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransaction({ transactionId, traceId, apmEventClient, start, end, }: {
    transactionId: string;
    traceId?: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<Transaction | undefined>;
