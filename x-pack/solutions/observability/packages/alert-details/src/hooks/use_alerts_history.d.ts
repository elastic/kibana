import { type HttpSetup } from '@kbn/core/public';
import type { AggregationsDateHistogramBucketKeys } from '@elastic/elasticsearch/lib/api/types';
export interface Props {
    http: HttpSetup | undefined;
    ruleTypeIds: string[];
    consumers?: string[];
    ruleId: string;
    dateRange: {
        from: string;
        to: string;
    };
    instanceId?: string;
}
interface FetchAlertsHistory {
    totalTriggeredAlerts: number;
    histogramTriggeredAlerts: AggregationsDateHistogramBucketKeys[];
    avgTimeToRecoverUS: number;
}
export interface UseAlertsHistory {
    data: FetchAlertsHistory;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export declare const EMPTY_ALERTS_HISTORY: {
    totalTriggeredAlerts: number;
    histogramTriggeredAlerts: AggregationsDateHistogramBucketKeys[];
    avgTimeToRecoverUS: number;
};
export declare function useAlertsHistory({ ruleTypeIds, consumers, ruleId, dateRange, http, instanceId, }: Props): UseAlertsHistory;
export declare function fetchTriggeredAlertsHistory({ ruleTypeIds, consumers, http, ruleId, dateRange, signal, instanceId, }: {
    ruleTypeIds: string[];
    consumers?: string[];
    http: HttpSetup;
    ruleId: string;
    dateRange: {
        from: string;
        to: string;
    };
    signal?: AbortSignal;
    instanceId?: string;
}): Promise<FetchAlertsHistory>;
export {};
