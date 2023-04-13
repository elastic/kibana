/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type {
  GroupingFieldTotalAggregation,
  GroupingAggregation,
} from '@kbn/securitysolution-grouping';
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';
import type { AlertsGroupingAggregation } from './grouping_settings/types';
import type { Status } from '../../../../common/detection_engine/schemas/common';
import { InspectButton } from '../../../common/components/inspect';
import { defaultUnit } from '../../../common/components/toolbar/unit';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { combineQueries } from '../../../common/lib/kuery';
import type { TableIdLiteral } from '../../../../common/types';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { useKibana } from '../../../common/lib/kibana';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useInspectButton } from '../alerts_kpis/common/hooks';

import { buildTimeRangeFilter } from './helpers';
import * as i18n from './translations';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../containers/detection_engine/alerts/constants';
import {
  getAlertsGroupingQuery,
  getDefaultGroupingOptions,
  renderGroupPanel,
  getStats,
  useGroupTakeActionsItems,
} from './grouping_settings';
import { updateGroupSelector, updateSelectedGroup } from '../../../common/store/grouping/actions';
import { track } from '../../../common/lib/telemetry';

const ALERTS_GROUPING_ID = 'alerts-grouping';

export interface AlertsTableComponentProps {
  currentAlertStatusFilterValue?: Status;
  defaultFilters?: Filter[];
  from: string;
  globalFilters: Filter[];
  globalQuery: Query;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  loading: boolean;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  runtimeMappings: MappingRuntimeFields;
  signalIndexName: string | null;
  tableId: TableIdLiteral;
  to: string;
}

export const GroupedAlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
  defaultFilters = [],
  from,
  globalFilters,
  globalQuery,
  hasIndexMaintenance,
  hasIndexWrite,
  loading,
  tableId,
  to,
  runtimeMappings,
  signalIndexName,
  currentAlertStatusFilterValue,
  renderChildComponent,
}) => {
  const dispatch = useDispatch();

  const { browserFields, indexPattern, selectedPatterns } = useSourcererDataView(
    SourcererScopeName.detections
  );
  const {
    services: { uiSettings, telemetry },
  } = useKibana();

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
            ...buildTimeRangeFilter(from, to),
          ],
          kqlQuery: globalQuery,
          kqlMode: globalQuery.language,
        });
      }
      return null;
    },
    [browserFields, indexPattern, uiSettings, defaultFilters, globalFilters, from, to, globalQuery]
  );

  const { onGroupChange, onGroupToggle } = useMemo(
    () => ({
      onGroupChange: (param: { groupByField: string; tableId: string }) => {
        telemetry.reportAlertsGroupingChanged(param);
      },
      onGroupToggle: (param: {
        isOpen: boolean;
        groupName?: string | undefined;
        groupNumber: number;
        groupingId: string;
      }) => telemetry.reportAlertsGroupingToggled({ ...param, tableId: param.groupingId }),
    }),
    [telemetry]
  );

  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_GROUPING_ID}-${uuidv4()}`, []);

  const inspect = useMemo(
    () => (
      <InspectButton queryId={uniqueQueryId} inspectIndex={0} title={i18n.INSPECT_GROUPING_TITLE} />
    ),
    [uniqueQueryId]
  );

  const { groupSelector, getGrouping, selectedGroup, pagination } = useGrouping({
    componentProps: {
      groupPanelRenderer: renderGroupPanel,
      groupStatsRenderer: getStats,
      inspectButton: inspect,
      onGroupToggle,
      renderChildComponent,
      unit: defaultUnit,
    },
    defaultGroupingOptions: getDefaultGroupingOptions(tableId),
    fields: indexPattern.fields,
    groupingId: tableId,
    onGroupChange,
    tracker: track,
  });
  const resetPagination = pagination.reset;

  useEffect(() => {
    dispatch(updateGroupSelector({ groupSelector }));
  }, [dispatch, groupSelector]);

  useEffect(() => {
    dispatch(updateSelectedGroup({ selectedGroup }));
  }, [dispatch, selectedGroup]);

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: getGlobalQuery([])?.filterQuery,
    kqlError: getGlobalQuery([])?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  const { deleteQuery, setQuery } = useGlobalTime(false);
  const additionalFilters = useMemo(() => {
    resetPagination();
    try {
      return [
        buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
          ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
          ...(defaultFilters ?? []),
        ]),
      ];
    } catch (e) {
      return [];
    }
  }, [defaultFilters, globalFilters, globalQuery, resetPagination]);

  const queryGroups = useMemo(
    () =>
      getAlertsGroupingQuery({
        additionalFilters,
        selectedGroup,
        from,
        runtimeMappings,
        to,
        pageSize: pagination.pageSize,
        pageIndex: pagination.pageIndex,
      }),
    [
      additionalFilters,
      selectedGroup,
      from,
      runtimeMappings,
      to,
      pagination.pageSize,
      pagination.pageIndex,
    ]
  );

  const {
    data: alertsGroupsData,
    loading: isLoadingGroups,
    refetch,
    request,
    response,
    setQuery: setAlertsQuery,
  } = useQueryAlerts<
    {},
    GroupingAggregation<AlertsGroupingAggregation> &
      GroupingFieldTotalAggregation<AlertsGroupingAggregation>
  >({
    query: queryGroups,
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.ALERTS_GROUPING,
    skip: isNoneGroup(selectedGroup),
  });

  useEffect(() => {
    if (!isNoneGroup(selectedGroup)) {
      setAlertsQuery(queryGroups);
    }
  }, [queryGroups, selectedGroup, setAlertsQuery]);

  useInspectButton({
    deleteQuery,
    loading: isLoadingGroups,
    response,
    setQuery,
    refetch,
    request,
    uniqueQueryId,
  });

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

  const groupedAlerts = useMemo(
    () =>
      getGrouping({
        data: alertsGroupsData?.aggregations,
        isLoading: loading || isLoadingGroups,
        takeActionItems: getTakeActionItems,
      }),
    [alertsGroupsData?.aggregations, getGrouping, getTakeActionItems, isLoadingGroups, loading]
  );

  if (isEmpty(selectedPatterns)) {
    return null;
  }

  return groupedAlerts;
};

export const GroupedAlertsTable = React.memo(GroupedAlertsTableComponent);
