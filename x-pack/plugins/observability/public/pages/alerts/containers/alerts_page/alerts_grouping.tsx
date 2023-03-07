/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { buildEsQuery, Filter } from '@kbn/es-query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataView } from '@kbn/data-views-plugin/common';
import { isNoneGroup, useGrouping, RawBucket } from '@kbn/securitysolution-grouping';
import { AlertsGroupingAggregation } from './grouping/types';
import {
  getAlertsGroupingQuery,
  getDefaultGroupingOptions,
  getSelectedGroupBadgeMetrics,
  getSelectedGroupButtonContent,
  getSelectedGroupCustomMetrics,
} from './grouping';

interface OwnProps {
  dataView: DataView | null;
  from: string;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  setGroupSelector: (selector: React.ReactElement) => void;
  esQuery: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  tableId: string;
  to: string;
}
export const AlertsGroupingComponent: React.FC<OwnProps> = ({
  // defaultFilters = [],
  dataView,
  esQuery,
  from,
  setGroupSelector,
  // globalFilters,
  // globalQuery,
  // hasIndexMaintenance,
  // hasIndexWrite,
  // loading,
  tableId,
  to,
  // runtimeMappings,
  // signalIndexName,
  // currentAlertStatusFilterValue,
  renderChildComponent,
}) => {
  const { groupSelector, getGrouping, selectedGroup, pagination } = useGrouping({
    defaultGroupingOptions: getDefaultGroupingOptions(),
    groupingId: tableId,
    fields: dataView != null ? dataView.fields : [],
  });

  useEffect(() => {
    setGroupSelector(groupSelector);
  }, [setGroupSelector, groupSelector]);

  const resetPagination = pagination.reset;

  const additionalFilters = useMemo(() => {
    resetPagination();
    try {
      return [
        buildEsQuery(undefined, esQuery != null ? [{ query: esQuery, language: `kuery` }] : [], []),
      ];
    } catch (e) {
      return [];
    }
  }, [esQuery, resetPagination]);

  const queryGroups = useMemo(
    () =>
      getAlertsGroupingQuery({
        additionalFilters,
        selectedGroup,
        from,
        runtimeMappings: {},
        to,
        pageSize: pagination.pageSize,
        pageIndex: pagination.pageIndex,
      }),
    [additionalFilters, selectedGroup, from, to, pagination.pageSize, pagination.pageIndex]
  );

  return useMemo(
    () =>
      isNoneGroup(selectedGroup)
        ? renderChildComponent([])
        : getGrouping({
            badgeMetricStats: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
              getSelectedGroupBadgeMetrics(selectedGroup, fieldBucket),
            customMetricStats: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
              getSelectedGroupCustomMetrics(selectedGroup, fieldBucket),
            data: {}, // alertsGroupsData?.aggregations,
            groupPanelRenderer: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
              getSelectedGroupButtonContent(selectedGroup, fieldBucket),
            inspectButton: <></>,
            isLoading: false,
            renderChildComponent,
            takeActionItems: () => [],
          }),
    [getGrouping, renderChildComponent, selectedGroup]
  );
};

export const AlertsGrouping = React.memo(AlertsGroupingComponent);
