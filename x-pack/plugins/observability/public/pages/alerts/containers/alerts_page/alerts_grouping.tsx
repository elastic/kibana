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
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';
import type {
  GroupingFieldTotalAggregation,
  GroupingAggregation,
  RawBucket,
} from '@kbn/securitysolution-grouping';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useQueryAlerts } from '../../../../hooks/use_query_alerts';
import { AlertsGroupingAggregation } from './grouping/types';
import {
  getAlertsGroupingQuery,
  getDefaultGroupingOptions,
  getSelectedGroupBadgeMetrics,
  getSelectedGroupCustomMetrics,
  getSelectedGroupButtonContent,
} from './grouping';

interface OwnProps {
  dataView: DataView | null;
  from: string;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  esQuery: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  tableId: string;
  to: string;
  featureIds: AlertConsumers[];
}
export const AlertsGroupingComponent: React.FC<OwnProps> = ({
  dataView,
  esQuery,
  featureIds,
  from,
  tableId,
  to,
  renderChildComponent,
}) => {
  const { groupSelector, getGrouping, selectedGroup, pagination } = useGrouping({
    defaultGroupingOptions: getDefaultGroupingOptions(),
    groupingId: tableId,
    fields: dataView != null ? dataView.fields : [],
  });

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

  const {
    data: alertsGroupsData,
    loading: isLoadingGroups,
    // refetch,
    // request,
    // response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<
    {},
    GroupingAggregation<AlertsGroupingAggregation> & GroupingFieldTotalAggregation
  >({
    featureIds,
    query: queryGroups,
    indexName: dataView?.getName(),
    skip: isNoneGroup(selectedGroup),
  });

  useEffect(() => {
    if (!isNoneGroup(selectedGroup)) {
      setAlertsQuery(queryGroups);
    }
  }, [queryGroups, selectedGroup, setAlertsQuery]);

  return useMemo(
    () =>
      isNoneGroup(selectedGroup) ? (
        <>
          <>{groupSelector}</>
          <>{renderChildComponent([])}</>
        </>
      ) : (
        getGrouping({
          badgeMetricStats: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
            getSelectedGroupBadgeMetrics(selectedGroup, fieldBucket),
          customMetricStats: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
            getSelectedGroupCustomMetrics(selectedGroup, fieldBucket),
          data: alertsGroupsData?.aggregations,
          groupPanelRenderer: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
            getSelectedGroupButtonContent(selectedGroup, fieldBucket),
          inspectButton: <></>,
          isLoading: isLoadingGroups,
          renderChildComponent,
          takeActionItems: () => [],
        })
      ),
    [
      alertsGroupsData?.aggregations,
      getGrouping,
      groupSelector,
      renderChildComponent,
      selectedGroup,
    ]
  );
};

export const AlertsGrouping = React.memo(AlertsGroupingComponent);
