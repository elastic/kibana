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
  RawBucket,
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
  getSelectedGroupBadgeMetrics,
  getSelectedGroupButtonContent,
  getSelectedGroupCustomMetrics,
  useGroupTakeActionsItems,
} from './grouping_settings';
import { updateGroupSelector, updateSelectedGroup } from '../../../common/store/grouping/actions';

const ALERTS_GROUPING_ID = 'alerts-grouping';

interface OwnProps {
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

export type AlertsTableComponentProps = OwnProps;

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
  const kibana = useKibana();

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && indexPattern != null) {
        return combineQueries({
          config: getEsQueryConfig(kibana.services.uiSettings),
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
    [browserFields, defaultFilters, globalFilters, globalQuery, indexPattern, kibana, to, from]
  );

  const { groupSelector, getGrouping, selectedGroup, pagination } = useGrouping({
    defaultGroupingOptions: getDefaultGroupingOptions(tableId),
    groupingId: tableId,
    fields: indexPattern.fields,
  });

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
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_GROUPING_ID}-${uuidv4()}`, []);

  const additionalFilters = useMemo(() => {
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
  }, [defaultFilters, globalFilters, globalQuery]);

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
    GroupingAggregation<AlertsGroupingAggregation> & GroupingFieldTotalAggregation
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
    (groupFilters: Filter[]) =>
      takeActionItems(getGlobalQuery([...(defaultFilters ?? []), ...groupFilters])?.filterQuery),
    [defaultFilters, getGlobalQuery, takeActionItems]
  );

  const groupedAlerts = useMemo(
    () =>
      isNoneGroup(selectedGroup)
        ? renderChildComponent([])
        : getGrouping({
            badgeMetricStats: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
              getSelectedGroupBadgeMetrics(selectedGroup, fieldBucket),
            customMetricStats: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
              getSelectedGroupCustomMetrics(selectedGroup, fieldBucket),
            data: alertsGroupsData?.aggregations,
            groupPanelRenderer: (fieldBucket: RawBucket<AlertsGroupingAggregation>) =>
              getSelectedGroupButtonContent(selectedGroup, fieldBucket),
            inspectButton: inspect,
            isLoading: loading || isLoadingGroups,
            renderChildComponent,
            takeActionItems: getTakeActionItems,
            unit: defaultUnit,
          }),
    [
      alertsGroupsData?.aggregations,
      getGrouping,
      getTakeActionItems,
      inspect,
      isLoadingGroups,
      loading,
      renderChildComponent,
      selectedGroup,
    ]
  );

  if (isEmpty(selectedPatterns)) {
    return null;
  }

  return groupedAlerts;
};

export const GroupedAlertsTable = React.memo(GroupedAlertsTableComponent);
