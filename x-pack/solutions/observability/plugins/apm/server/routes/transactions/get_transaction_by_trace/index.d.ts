import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getRootTransactionByTraceId({ traceId, apmEventClient, start, end, }: {
    traceId: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<{
    transaction: TransactionDetailRedirectInfo | undefined;
}>;
