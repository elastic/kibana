import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransactionByName({ transactionName, serviceName, apmEventClient, start, end, }: {
    transactionName: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<TransactionDetailRedirectInfo | undefined>;
