import type { ReactElement } from 'react';
import React from 'react';
import type { Theme } from '@elastic/charts';
import type { BoolQuery } from '@kbn/es-query';
import type { RecursivePartial } from '@elastic/eui';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
export declare function ThroughputChart({ alert, transactionType, transactionTypes, setTransactionType, transactionName, serviceName, environment, start, end, comparisonChartTheme, comparisonEnabled, offset, timeZone, kuery, filters, customAlertEvaluationThreshold, threshold, ruleTypeId, compact, showAlertAnnotations, }: {
    alert: TopAlert;
    transactionType?: string;
    transactionTypes?: string[];
    setTransactionType?: (transactionType: string) => void;
    transactionName?: string;
    serviceName: string;
    environment: string;
    start: string;
    end: string;
    comparisonChartTheme: RecursivePartial<Theme>;
    comparisonEnabled: boolean;
    offset: string;
    timeZone: string;
    kuery?: string;
    filters?: BoolQuery;
    customAlertEvaluationThreshold?: number;
    threshold?: ReactElement;
    ruleTypeId?: ApmRuleType;
    /** When true, hide the threshold side panel even if `threshold` is provided. */
    compact?: boolean;
    /** When set, overrides the default annotation behavior (which is keyed off `threshold`). */
    showAlertAnnotations?: boolean;
}): React.JSX.Element;
