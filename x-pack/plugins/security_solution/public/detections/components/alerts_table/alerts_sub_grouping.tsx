/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { GroupingAggregation } from '@kbn/securitysolution-grouping';
import { isNoneGroup } from '@kbn/securitysolution-grouping';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DynamicGroupingProps } from '@kbn/securitysolution-grouping/src';
import type { TableIdLiteral } from '@kbn/securitysolution-data-table';
import { parseGroupingQuery } from '@kbn/securitysolution-grouping/src';
import type { RunTimeMappings } from '../../../common/store/sourcerer/model';
import { combineQueries } from '../../../common/lib/kuery';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import type { Status } from '../../../../common/api/detection_engine';
import { InspectButton } from '../../../common/components/inspect';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useKibana } from '../../../common/lib/kibana';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { useInspectButton } from '../alerts_kpis/common/hooks';
import { buildTimeRangeFilter } from './helpers';

import * as i18n from './translations';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../containers/detection_engine/alerts/constants';
import { getAlertsGroupingQuery, useGroupTakeActionsItems } from './grouping_settings';

const ALERTS_GROUPING_ID = 'alerts-grouping';

interface OwnProps {
  currentAlertStatusFilterValue?: Status[];
  defaultFilters?: Filter[];
  from: string;
  getGrouping: (
    props: Omit<DynamicGroupingProps<AlertsGroupingAggregation>, 'groupSelector' | 'pagination'>
  ) => React.ReactElement;
  globalFilters: Filter[];
  globalQuery: Query;
  groupingLevel?: number;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  loading: boolean;
  onGroupClose: () => void;
  pageIndex: number;
  pageSize: number;
  parentGroupingFilter?: string;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  runtimeMappings: RunTimeMappings;
  selectedGroup: string;
  setPageIndex: (newIndex: number) => void;
  setPageSize: (newSize: number) => void;
  signalIndexName: string | null;
  tableId: TableIdLiteral;
  to: string;
}

export type AlertsTableComponentProps = OwnProps;

export const GroupedSubLevelComponent: React.FC<AlertsTableComponentProps> = ({
  currentAlertStatusFilterValue,
  defaultFilters = [],
  from,
  getGrouping,
  globalFilters,
  globalQuery,
  groupingLevel,
  hasIndexMaintenance,
  hasIndexWrite,
  loading,
  onGroupClose,
  pageIndex,
  pageSize,
  parentGroupingFilter,
  renderChildComponent,
  runtimeMappings,
  selectedGroup,
  setPageIndex,
  setPageSize,
  signalIndexName,
  tableId,
  to,
}) => {
  const {
    services: { uiSettings },
  } = useKibana();
  const { browserFields, indexPattern } = useSourcererDataView(SourcererScopeName.detections);

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && indexPattern != null) {
        return combineQueries({
          config: getEsQueryConfig(uiSettings),
          dataProviders: [],
          indexPattern,
          browserFields,
          filters: [
            ...(defaultFilters ?? []),
            ...globalFilters,
            ...customFilters,
            ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
            ...buildTimeRangeFilter(from, to),
          ],
          kqlQuery: globalQuery,
          kqlMode: globalQuery.language,
        });
      }
      return null;
    },
    [
      browserFields,
      defaultFilters,
      from,
      globalFilters,
      globalQuery,
      indexPattern,
      parentGroupingFilter,
      to,
      uiSettings,
    ]
  );

  const additionalFilters = useMemo(() => {
    try {
      return [
        buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
          ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
          ...(defaultFilters ?? []),
          ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
        ]),
      ];
    } catch (e) {
      return [];
    }
  }, [defaultFilters, globalFilters, globalQuery, parentGroupingFilter]);

  // create a unique, but stable (across re-renders) value
  const uniqueValue = useMemo(() => `SuperUniqueValue-${uuidv4()}`, []);

  const queryGroups = useMemo(() => {
    return getAlertsGroupingQuery({
      additionalFilters,
      selectedGroup,
      uniqueValue,
      from,
      runtimeMappings,
      to,
      pageSize,
      pageIndex,
    });
  }, [
    additionalFilters,
    from,
    pageIndex,
    pageSize,
    runtimeMappings,
    selectedGroup,
    to,
    uniqueValue,
  ]);

  const emptyGlobalQuery = useMemo(() => getGlobalQuery([]), [getGlobalQuery]);

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: emptyGlobalQuery?.filterQuery,
    kqlError: emptyGlobalQuery?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const {
    data: alertsGroupsData,
    loading: isLoadingGroups,
    refetch,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<{}, GroupingAggregation<AlertsGroupingAggregation>>({
    query: queryGroups,
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.ALERTS_GROUPING,
    skip: isNoneGroup([selectedGroup]),
  });

  const queriedGroup = useRef<string | null>(null);

  const aggs = useMemo(
    // queriedGroup because `selectedGroup` updates before the query response
    () =>
      parseGroupingQuery(
        // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
        queriedGroup.current === null ? selectedGroup : queriedGroup.current,
        uniqueValue,
        alertsGroupsData?.aggregations
      ),
    [alertsGroupsData?.aggregations, selectedGroup, uniqueValue]
  );

  useEffect(() => {
    if (!isNoneGroup([selectedGroup])) {
      queriedGroup.current =
        queryGroups?.runtime_mappings?.groupByField?.script?.params?.selectedGroup ?? '';
      setAlertsQuery(queryGroups);
    }
  }, [queryGroups, selectedGroup, setAlertsQuery]);

  const { deleteQuery, setQuery } = useGlobalTime();
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_GROUPING_ID}-${uuidv4()}`, []);

  useInspectButton({
    deleteQuery,
    loading: isLoadingGroups,
    refetch,
    request,
    response,
    setQuery,
    uniqueQueryId,
  });

  const inspect = useMemo(
    () => (
      <InspectButton queryId={uniqueQueryId} inspectIndex={0} title={i18n.INSPECT_GROUPING_TITLE} />
    ),
    [uniqueQueryId]
  );

  const takeActionItems = useGroupTakeActionsItems({
    currentStatus: currentAlertStatusFilterValue,
    showAlertStatusActions: hasIndexWrite && hasIndexMaintenance,
  });

  const getTakeActionItems = useCallback(
    (groupFilters: Filter[], groupNumber: number) =>
      takeActionItems({
        groupNumber,
        query: getGlobalQuery([...(defaultFilters ?? []), ...groupFilters])?.filterQuery,
        selectedGroup,
        tableId,
      }),
    [defaultFilters, getGlobalQuery, selectedGroup, tableId, takeActionItems]
  );

  return useMemo(
    () =>
      getGrouping({
        activePage: pageIndex,
        data: aggs,
        groupingLevel,
        inspectButton: inspect,
        isLoading: loading || isLoadingGroups,
        itemsPerPage: pageSize,
        onChangeGroupsItemsPerPage: (size: number) => setPageSize(size),
        onChangeGroupsPage: (index) => setPageIndex(index),
        onGroupClose,
        renderChildComponent,
        selectedGroup,
        takeActionItems: getTakeActionItems,
      }),
    [
      aggs,
      getGrouping,
      getTakeActionItems,
      groupingLevel,
      inspect,
      isLoadingGroups,
      loading,
      onGroupClose,
      pageIndex,
      pageSize,
      renderChildComponent,
      selectedGroup,
      setPageIndex,
      setPageSize,
    ]
  );
};

export const GroupedSubLevel = React.memo(GroupedSubLevelComponent);
