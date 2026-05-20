import type { ReactElement } from 'react';
import React from 'react';
import type { RecursivePartial } from '@elastic/eui';
import type { BoolQuery } from '@kbn/es-query';
import type { Theme } from '@elastic/charts';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
export declare function FailedTransactionChart({ alert, transactionType, transactionTypes, setTransactionType, transactionName, serviceName, environment, start, end, comparisonChartTheme, timeZone, comparisonEnabled, offset, kuery, filters, customAlertEvaluationThreshold, threshold, ruleTypeId, compact, showAlertAnnotations, }: {
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
    timeZone: string;
    comparisonEnabled: boolean;
    offset: string;
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
