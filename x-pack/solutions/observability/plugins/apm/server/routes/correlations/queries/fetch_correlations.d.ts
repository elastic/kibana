import type { CorrelationsResponse, CommonCorrelationsQueryParams, Metric } from '../../../../common/correlations/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
/** Scope of correlation analysis: transactions (incoming) or exit spans (outgoing to dependencies) */
export type CorrelationsScope = 'transactions' | 'exitSpans';
interface FetchCorrelationsParams extends CommonCorrelationsQueryParams {
    apmEventClient: APMEventClient;
    metric: Metric;
    /** When 'exitSpans', analysis runs on raw exit span documents (span.destination.service.resource exists). Default 'transactions'. */
    scope?: CorrelationsScope;
    fieldCandidates?: string[];
    percentileThreshold?: number;
    durationMin?: number;
    durationMax?: number;
    includeHistogram?: boolean;
    correlationType?: 'significant' | 'p-value';
    config?: {
        apm: {
            searchAggregatedTransactions?: boolean;
        };
    };
}
export declare function fetchCorrelations({ apmEventClient, metric, scope, fieldCandidates: providedFieldCandidates, start, end, environment, kuery, query, percentileThreshold, durationMin: providedDurationMin, durationMax: providedDurationMax, includeHistogram, config, }: FetchCorrelationsParams): Promise<CorrelationsResponse>;
export {};
