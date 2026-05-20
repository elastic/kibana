import React from 'react';
import type { ConnectionStatsItemWithComparisonData } from '../../../../common/connections';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { SpanMetricGroup } from './get_span_metric_columns';
export type DependenciesItem = Omit<ConnectionStatsItemWithComparisonData, 'location'> & {
    name: string;
    link: React.ReactElement;
};
export declare const INITIAL_SORTING_FIELD = "impact";
export declare const INITIAL_SORTING_DIRECTION = "desc";
interface Props {
    dependencies: DependenciesItem[];
    initialPageSize: number;
    fixedHeight?: boolean;
    link?: React.ReactNode;
    title: React.ReactNode;
    nameColumnTitle: React.ReactNode;
    status: FETCH_STATUS;
    compact?: boolean;
    showPerPageOptions?: boolean;
    showSparkPlots?: boolean;
    onChangeRenderedItems?: (items: FormattedSpanMetricGroup[]) => void;
    saveTableOptionsToUrl?: boolean;
}
export type FormattedSpanMetricGroup = SpanMetricGroup & {
    name: string;
    link: React.ReactElement;
};
export declare function DependenciesTable({ dependencies, fixedHeight, link, title, nameColumnTitle, status, compact, showPerPageOptions, initialPageSize, showSparkPlots, onChangeRenderedItems, saveTableOptionsToUrl, }: Props): React.JSX.Element;
export {};
