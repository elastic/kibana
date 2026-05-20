import type { getDurationFieldForTransactions } from '@kbn/apm-data-access-plugin/server/utils';
import type { AggregationType } from '../../../../../common/rules/apm_rule_types';
type TransactionDurationField = ReturnType<typeof getDurationFieldForTransactions>;
type AvgLatencyAgg = {
    avgLatency: {
        avg: {
            field: TransactionDurationField;
        };
    };
};
type PctLatencyAgg = {
    pctLatency: {
        percentiles: {
            field: TransactionDurationField;
            percents: [95] | [99];
            keyed: false;
        };
    };
};
export declare function averageOrPercentileAgg({ aggregationType, transactionDurationField, }: {
    aggregationType: AggregationType;
    transactionDurationField: TransactionDurationField;
}): AvgLatencyAgg | PctLatencyAgg;
export declare function getMultiTermsSortOrder(aggregationType: AggregationType): {
    order: {
        [path: string]: 'desc';
    };
};
export {};
