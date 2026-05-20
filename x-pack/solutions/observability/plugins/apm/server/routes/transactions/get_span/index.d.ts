import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
export declare function getSpan({ spanId, traceId, parentTransactionId, apmEventClient, start, end, }: {
    spanId: string;
    traceId: string;
    parentTransactionId?: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<{
    span?: Span;
    parentTransaction?: Transaction;
}>;
