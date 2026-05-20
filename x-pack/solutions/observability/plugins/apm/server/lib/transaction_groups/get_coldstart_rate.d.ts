import type { Coordinate } from '../../../typings/timeseries';
import type { APMEventClient } from '../helpers/create_es_client/create_apm_event_client';
export declare function getColdstartRate({ environment, kuery, serviceName, transactionType, transactionName, apmEventClient, searchAggregatedTransactions, start, end, offset, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    transactionType?: string;
    transactionName: string;
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
    offset?: string;
}): Promise<{
    transactionColdstartRate: Coordinate[];
    average: number | null;
}>;
export interface ColdstartRateResponse {
    currentPeriod: {
        transactionColdstartRate: Coordinate[];
        average: number | null;
    };
    previousPeriod: {
        transactionColdstartRate: Coordinate[];
        average: number | null;
    };
}
export declare function getColdstartRatePeriods({ environment, kuery, serviceName, transactionType, transactionName, apmEventClient, searchAggregatedTransactions, start, end, offset, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    transactionType?: string;
    transactionName?: string;
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
    offset?: string;
}): Promise<ColdstartRateResponse>;
