import React from 'react';
import type { ESQLQueryParams, IndexType } from '../../../shared/links/discover_links/get_esql_query';
/**
 * Chart names used as the `data-ebt-element` value for click telemetry
 * on the alert details RED metrics and error count charts actions.
 */
export declare const RED_METRICS_CHART_ELEMENT: {
    readonly LATENCY: "latencyChart";
    readonly THROUGHPUT: "throughputChart";
    readonly FAILED_TRANSACTION_RATE: "failedTransactionRateChart";
    readonly ERROR_COUNT: "errorCountChart";
};
export type RedMetricsChartElement = (typeof RED_METRICS_CHART_ELEMENT)[keyof typeof RED_METRICS_CHART_ELEMENT];
interface RedMetricsChartActionsProps {
    queryParams: Pick<ESQLQueryParams, 'serviceName' | 'environment' | 'transactionName' | 'transactionType' | 'kuery' | 'errorGroupId'>;
    timeRange: {
        from: string;
        to: string;
    };
    indexType?: IndexType;
    ruleTypeId?: string;
    element: RedMetricsChartElement;
}
export declare function RedMetricsChartActions(props: RedMetricsChartActionsProps): React.JSX.Element | null;
export {};
