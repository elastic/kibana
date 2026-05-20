import type { ReactElement } from 'react';
import type { Filter } from '@kbn/es-query';
import type { DynamicGroupingProps } from '@kbn/grouping/src';
import type { AlertsGroupingProps, BaseAlertsGroupAggregations } from '../types';
export interface AlertsGroupingLevelProps<T extends BaseAlertsGroupAggregations = BaseAlertsGroupAggregations> extends AlertsGroupingProps<T> {
    getGrouping: (props: Omit<DynamicGroupingProps<T>, 'groupSelector' | 'pagination'>) => ReactElement;
    groupingLevel?: number;
    onGroupClose: () => void;
    pageIndex: number;
    pageSize: number;
    parentGroupingFilter?: Filter[];
    selectedGroup: string;
    setPageIndex: (newIndex: number) => void;
    setPageSize: (newSize: number) => void;
}
export declare const AlertsGroupingLevel: <T extends BaseAlertsGroupAggregations>({ ruleTypeIds, consumers, defaultFilters, from, getGrouping, globalFilters, globalQuery, groupingLevel, loading, onGroupClose, pageIndex, pageSize, parentGroupingFilter, children, selectedGroup, setPageIndex, setPageSize, to, takeActionItems, getAggregationsByGroupingField, services: { http, notifications }, }: AlertsGroupingLevelProps<T>) => ReactElement<any, string | import("react").JSXElementConstructor<any>>;
