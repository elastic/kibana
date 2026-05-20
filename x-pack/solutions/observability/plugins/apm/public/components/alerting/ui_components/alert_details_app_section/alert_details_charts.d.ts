import type { ReactElement } from 'react';
import React from 'react';
import type { RecursivePartial } from '@elastic/eui';
import type { Theme } from '@elastic/charts';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { ChartId } from './types';
export declare function AlertDetailsCharts({ alert, alertRuleTypeId, chartLayout, serviceName, environment, transactionName, transactionType, errorGroupingKey, ruleAggregationType, comparisonChartTheme, timeZone, from, to, thresholdComponent, }: {
    alert: TopAlert;
    alertRuleTypeId: ApmRuleType;
    chartLayout: {
        primary: ChartId;
        secondary: [ChartId, ChartId];
    };
    serviceName: string;
    environment: string;
    transactionName?: string;
    transactionType?: string;
    errorGroupingKey?: string;
    ruleAggregationType?: string;
    comparisonChartTheme: RecursivePartial<Theme>;
    timeZone: string;
    from: string;
    to: string;
    thresholdComponent?: ReactElement;
}): React.JSX.Element;
