import type { APMConfig } from '../../..';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface TransactionBreakdownResponse {
    timeseries: Array<{
        title: string;
        type: string;
        data: Array<{
            x: number;
            y: number | null;
        }>;
        hideLegend: boolean;
        legendValue: any;
    }>;
}
export declare function getTransactionBreakdown({ environment, kuery, config, apmEventClient, serviceName, transactionName, transactionType, start, end, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    transactionName?: string;
    transactionType: string;
    start: number;
    end: number;
}): Promise<TransactionBreakdownResponse>;
