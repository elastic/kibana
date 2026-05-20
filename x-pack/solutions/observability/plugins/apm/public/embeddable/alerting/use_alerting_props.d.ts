import type { Rule } from '@kbn/alerting-plugin/common';
import type { LatencyAggregationType } from '../../../common/latency_aggregation_types';
export declare function useAlertingProps({ rule, serviceName, kuery, rangeFrom, rangeTo, defaultTransactionType, }: {
    rule: Rule<{
        aggregationType: LatencyAggregationType;
    }>;
    serviceName: string;
    kuery?: string;
    rangeFrom: string;
    rangeTo: string;
    defaultTransactionType?: string;
}): {
    transactionType: string | undefined;
    transactionTypes: string[];
    setTransactionType: import("react").Dispatch<import("react").SetStateAction<string | undefined>>;
    latencyAggregationType: LatencyAggregationType;
    setLatencyAggregationType: import("react").Dispatch<import("react").SetStateAction<LatencyAggregationType>>;
    comparisonChartTheme: import("@elastic/charts").RecursivePartial<import("@elastic/charts").Theme>;
    timeZone: string;
};
