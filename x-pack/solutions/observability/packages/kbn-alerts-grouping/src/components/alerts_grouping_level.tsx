/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { memo, ReactElement, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { type GroupingAggregation } from '@kbn/grouping';
import { isNoneGroup } from '@kbn/grouping';
import type { DynamicGroupingProps } from '@kbn/grouping/src';
import { parseGroupingQuery } from '@kbn/grouping/src';
import { ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import {
  useGetAlertsGroupAggregationsQuery,
  UseGetAlertsGroupAggregationsQueryProps,
} from '@kbn/alerts-ui-shared';
import { AlertsGroupingProps, BaseAlertsGroupAggregations } from '../types';

export interface AlertsGroupingLevelProps<
  T extends BaseAlertsGroupAggregations = BaseAlertsGroupAggregations
> extends AlertsGroupingProps<T> {
  getGrouping: (
    props: Omit<DynamicGroupingProps<T>, 'groupSelector' | 'pagination'>
  ) => ReactElement;
  groupingLevel?: number;
  onGroupClose: () => void;
  pageIndex: number;
  pageSize: number;
  parentGroupingFilter?: Filter[];
  selectedGroup: string;
  setPageIndex: (newIndex: number) => void;
  setPageSize: (newSize: number) => void;
}

const DEFAULT_FILTERS: Filter[] = [];

/**
 * Renders an alerts grouping level
 */
const typedMemo: <T>(c: T) => T = memo;
export const AlertsGroupingLevel = typedMemo(
  <T extends BaseAlertsGroupAggregations>({
    ruleTypeIds,
    consumers,
    defaultFilters = DEFAULT_FILTERS,
    from,
    getGrouping,
    globalFilters,
    globalQuery,
    groupingLevel,
    loading = false,
    onGroupClose,
    pageIndex,
    pageSize,
    parentGroupingFilter,
    children,
    selectedGroup,
    setPageIndex,
    setPageSize,
    to,
    takeActionItems,
    getAggregationsByGroupingField,
    services: { http, notifications },
  }: AlertsGroupingLevelProps<T>) => {
    const filters = useMemo(() => {
      try {
        return [
          buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
            ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
            ...(defaultFilters ?? []),
            ...(parentGroupingFilter ?? []),
          ]),
        ];
      } catch (e) {
        return [];
      }
    }, [defaultFilters, globalFilters, globalQuery, parentGroupingFilter]);

    // Create a unique, but stable (across re-renders) value
    const uniqueValue = useMemo(() => `alerts-grouping-level-${uuidv4()}`, []);

    const aggregationsQuery = useMemo<UseGetAlertsGroupAggregationsQueryProps['params']>(() => {
      return {
        ruleTypeIds,
        consumers,
        groupByField: selectedGroup,
        aggregations: getAggregationsByGroupingField(selectedGroup)?.reduce(
          (acc, val) => Object.assign(acc, val),
          {}
        ),
        filters: [
          ...filters,
          {
            range: {
              [ALERT_TIME_RANGE]: {
                gte: from,
                lte: to,
              },
            },
          },
        ],
        pageIndex,
        pageSize,
      };
    }, [
      consumers,
      filters,
      from,
      getAggregationsByGroupingField,
      pageIndex,
      pageSize,
      ruleTypeIds,
      selectedGroup,
      to,
    ]);

    const { data: alertGroupsData, isLoading: isLoadingGroups } =
      useGetAlertsGroupAggregationsQuery<GroupingAggregation<T>>({
        http,
        toasts: notifications.toasts,
        enabled: aggregationsQuery && !isNoneGroup([selectedGroup]),
        params: aggregationsQuery,
      });

    const queriedGroup = useMemo<string | null>(
      () => (!isNoneGroup([selectedGroup]) ? selectedGroup : null),
      [selectedGroup]
    );

    const aggs = useMemo(
      // queriedGroup because `selectedGroup` updates before the query response
      () =>
        parseGroupingQuery(
          // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
          queriedGroup === null ? selectedGroup : queriedGroup,
          uniqueValue,
          alertGroupsData?.aggregations
        ),
      [alertGroupsData?.aggregations, queriedGroup, selectedGroup, uniqueValue]
    );

    return useMemo(
      () =>
        getGrouping({
          activePage: pageIndex,
          data: aggs,
          groupingLevel,
          isLoading: loading || isLoadingGroups,
          itemsPerPage: pageSize,
          onChangeGroupsItemsPerPage: (size: number) => setPageSize(size),
          onChangeGroupsPage: (index) => setPageIndex(index),
          onGroupClose,
          renderChildComponent: children,
          selectedGroup,
          takeActionItems,
        }),
      [
        getGrouping,
        pageIndex,
        aggs,
        groupingLevel,
        loading,
        isLoadingGroups,
        pageSize,
        onGroupClose,
        children,
        selectedGroup,
        takeActionItems,
        setPageSize,
        setPageIndex,
      ]
    );
  }
);
