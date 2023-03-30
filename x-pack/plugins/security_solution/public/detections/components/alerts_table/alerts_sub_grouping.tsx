/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, Query } from '@kbn/es-query';
import type { DynamicGroupingProps, GroupingAggregation } from '@kbn/securitysolution-grouping';
import { isNoneGroup } from '@kbn/securitysolution-grouping';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { GroupingQuery } from '@kbn/securitysolution-grouping/src';
import { isEqual } from 'lodash/fp';
import { combineQueries } from '../../../common/lib/kuery';
import type { TableIdLiteral } from '../../../../common/types';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import type { Status } from '../../../../common/detection_engine/schemas/common';
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
import { useGroupTakeActionsItems } from './grouping_settings';

const ALERTS_GROUPING_ID = 'alerts-grouping';

interface OwnProps {
  currentAlertStatusFilterValue?: Status;
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
  parentGroupingFilter?: Filter[];
  queryGroups: GroupingQuery;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  resetPagination: () => void;
  selectedGroup: string;
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
  parentGroupingFilter,
  queryGroups,
  renderChildComponent,
  selectedGroup,
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
            ...(parentGroupingFilter ?? []),
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
      indexPattern,
      uiSettings,
      defaultFilters,
      globalFilters,
      parentGroupingFilter,
      from,
      to,
      globalQuery,
    ]
  );

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: getGlobalQuery([])?.filterQuery,
    kqlError: getGlobalQuery([])?.kqlError,
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

  const prevQueryGroups = useRef(queryGroups);

  useEffect(() => {
    if (!isEqual(prevQueryGroups.current, queryGroups)) {
      prevQueryGroups.current = queryGroups;
      setAlertsQuery(queryGroups);
    }
  }, [queryGroups, setAlertsQuery]);

  const { deleteQuery, setQuery } = useGlobalTime(false);
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_GROUPING_ID}-${uuidv4()}`, []);

  useInspectButton({
    deleteQuery,
    loading: isLoadingGroups,
    response,
    setQuery,
    refetch,
    request,
    uniqueQueryId,
  });

  const inspect = useMemo(
    () => (
      <InspectButton queryId={uniqueQueryId} inspectIndex={0} title={i18n.INSPECT_GROUPING_TITLE} />
    ),
    [uniqueQueryId]
  );

  const takeActionItems = useGroupTakeActionsItems({
    indexName: indexPattern.title,
    currentStatus: currentAlertStatusFilterValue,
    showAlertStatusActions: hasIndexWrite && hasIndexMaintenance,
  });

  const getTakeActionItems = useCallback(
    (groupFilters: Filter[], groupNumber: number) =>
      takeActionItems({
        query: getGlobalQuery([...(defaultFilters ?? []), ...groupFilters])?.filterQuery,
        tableId,
        groupNumber,
        selectedGroup,
      }),
    [defaultFilters, getGlobalQuery, selectedGroup, tableId, takeActionItems]
  );

  return useMemo(
    () =>
      getGrouping({
        data: alertsGroupsData?.aggregations,
        groupingLevel,
        inspectButton: inspect,
        isLoading: loading || isLoadingGroups,
        renderChildComponent,
        selectedGroup,
        takeActionItems: getTakeActionItems,
      }),
    [
      alertsGroupsData?.aggregations,
      getGrouping,
      getTakeActionItems,
      groupingLevel,
      inspect,
      isLoadingGroups,
      loading,
      renderChildComponent,
      selectedGroup,
    ]
  );
};

export const GroupedSubLevel = React.memo(GroupedSubLevelComponent);
