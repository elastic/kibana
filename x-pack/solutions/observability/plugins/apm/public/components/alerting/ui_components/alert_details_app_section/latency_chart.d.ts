import type { Theme } from '@elastic/charts';
import type { RecursivePartial } from '@elastic/eui';
import type { ReactElement } from 'react';
import React from 'react';
import type { BoolQuery } from '@kbn/es-query';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
export declare function LatencyChart({ alert, transactionType, transactionTypes, transactionName, serviceName, environment, start, end, ruleAggregationType, latencyAggregationType: latencyAggregationTypeProp, setLatencyAggregationType, setTransactionType, comparisonChartTheme, comparisonEnabled, offset, timeZone, customAlertEvaluationThreshold, kuery, filters, threshold, ruleTypeId, compact, showAlertAnnotations, }: {
    alert: TopAlert;
    transactionType?: string;
    transactionTypes?: string[];
    transactionName?: string;
    serviceName: string;
    environment: string;
    start: string;
    end: string;
    comparisonChartTheme: RecursivePartial<Theme>;
    ruleAggregationType?: string;
    latencyAggregationType?: LatencyAggregationType;
    setLatencyAggregationType?: (value: LatencyAggregationType) => void;
    setTransactionType?: (value: string) => void;
    comparisonEnabled: boolean;
    offset: string;
    timeZone: string;
    customAlertEvaluationThreshold?: number;
    threshold?: ReactElement;
    kuery?: string;
    filters?: BoolQuery;
    ruleTypeId?: ApmRuleType;
    /** When true, hide the threshold side panel even if `threshold` is provided. */
    compact?: boolean;
    /** When set, overrides the default annotation behavior (which is keyed off `threshold`). */
    showAlertAnnotations?: boolean;
}): React.JSX.Element;
