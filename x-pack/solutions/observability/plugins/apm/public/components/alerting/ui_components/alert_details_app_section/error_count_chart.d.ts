import type { ReactElement } from 'react';
import React from 'react';
import type { RecursivePartial } from '@elastic/eui';
import type { Theme } from '@elastic/charts';
import type { TopAlert } from '@kbn/observability-plugin/public';
export declare function ErrorCountChart({ alert, serviceName, environment, start, end, comparisonChartTheme, timeZone, comparisonEnabled, offset, kuery, transactionName, groupId, threshold, ruleTypeId, compact, showAlertAnnotations, }: {
    alert: TopAlert;
    serviceName: string;
    environment: string;
    start: string;
    end: string;
    comparisonChartTheme: RecursivePartial<Theme>;
    timeZone: string;
    comparisonEnabled: boolean;
    offset: string;
    kuery?: string;
    transactionName?: string;
    groupId?: string;
    threshold?: ReactElement;
    ruleTypeId?: string;
    /** When true, hide the threshold side panel even if `threshold` is provided. */
    compact?: boolean;
    /** When set, overrides the default annotation behavior (which is keyed off `threshold`). */
    showAlertAnnotations?: boolean;
}): React.JSX.Element;
