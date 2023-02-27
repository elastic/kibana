/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useGetGroupingSelector } from '../../../common/containers/grouping/hooks/use_get_group_selector';
import type { Status } from '../../../../common/detection_engine/schemas/common';
import { defaultGroup } from '../../../common/store/grouping/defaults';
import { groupSelectors } from '../../../common/store/grouping';
import { InspectButton } from '../../../common/components/inspect';
import { defaultUnit } from '../../../common/components/toolbar/unit';
import type {
  GroupingFieldTotalAggregation,
  GroupingTableAggregation,
  RawBucket,
} from '../../../common/components/grouping';
import { GroupingContainer, isNoneGroup } from '../../../common/components/grouping';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { combineQueries } from '../../../common/lib/kuery';
import type { TableIdLiteral } from '../../../../common/types';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { useKibana } from '../../../common/lib/kibana';
import type { inputsModel, State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useInspectButton } from '../alerts_kpis/common/hooks';

import { buildTimeRangeFilter } from './helpers';
import * as i18n from './translations';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../containers/detection_engine/alerts/constants';
import {
  getAlertsGroupingQuery,
  getSelectedGroupBadgeMetrics,
  getSelectedGroupButtonContent,
  getSelectedGroupCustomMetrics,
  useGroupTakeActionsItems,
} from './grouping_settings';
import { initGrouping } from '../../../common/store/grouping/actions';
import { useGroupingPagination } from '../../../common/containers/grouping/hooks/use_grouping_pagination';

/** This local storage key stores the `Grid / Event rendered view` selection */
export const ALERTS_TABLE_GROUPS_SELECTION_KEY = 'securitySolution.alerts.table.group-selection';

const ALERTS_GROUPING_ID = 'alerts-grouping';

interface OwnProps {
  defaultFilters?: Filter[];
  from: string;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  loading: boolean;
  tableId: TableIdLiteral;
  to: string;
  runtimeMappings: MappingRuntimeFields;
  signalIndexName: string | null;
  currentAlertStatusFilterValue?: Status;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
}

export type AlertsTableComponentProps = OwnProps & PropsFromRedux;

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
  const groupingId = tableId;

  const getGroupByIdSelector = groupSelectors.getGroupByIdSelector();

  const { activeGroup: selectedGroup } =
    useSelector((state: State) => getGroupByIdSelector(state, groupingId)) ?? defaultGroup;

  const {
    browserFields,
    indexPattern: indexPatterns,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.detections);
  const kibana = useKibana();

  const getGlobalQuery = useCallback(
    (customFilters: Filter[]) => {
      if (browserFields != null && indexPatterns != null) {
        return combineQueries({
          config: getEsQueryConfig(kibana.services.uiSettings),
          dataProviders: [],
          indexPattern: indexPatterns,
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
    [browserFields, defaultFilters, globalFilters, globalQuery, indexPatterns, kibana, to, from]
  );

  useInvalidFilterQuery({
    id: tableId,
    filterQuery: getGlobalQuery([])?.filterQuery,
    kqlError: getGlobalQuery([])?.kqlError,
    query: globalQuery,
    startDate: from,
    endDate: to,
  });

  useEffect(() => {
    dispatch(initGrouping({ id: tableId }));
  }, [dispatch, tableId]);

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

  const pagination = useGroupingPagination({
    groupingId,
  });

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
  } = useQueryAlerts<{}, GroupingTableAggregation & GroupingFieldTotalAggregation>({
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

  const groupsSelector = useGetGroupingSelector({
    tableId,
    groupingId,
    fields: indexPatterns.fields,
  });

  const takeActionItems = useGroupTakeActionsItems({
    indexName: indexPatterns.title,
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
      isNoneGroup(selectedGroup) ? (
        renderChildComponent([])
      ) : (
        <GroupingContainer
          badgeMetricStats={(fieldBucket: RawBucket) =>
            getSelectedGroupBadgeMetrics(selectedGroup, fieldBucket)
          }
          customMetricStats={(fieldBucket: RawBucket) =>
            getSelectedGroupCustomMetrics(selectedGroup, fieldBucket)
          }
          data={alertsGroupsData?.aggregations ?? {}}
          groupPanelRenderer={(fieldBucket: RawBucket) =>
            getSelectedGroupButtonContent(selectedGroup, fieldBucket)
          }
          groupsSelector={groupsSelector}
          inspectButton={inspect}
          isLoading={loading || isLoadingGroups}
          pagination={pagination}
          renderChildComponent={renderChildComponent}
          selectedGroup={selectedGroup}
          takeActionItems={getTakeActionItems}
          unit={defaultUnit}
        />
      ),
    [
      alertsGroupsData?.aggregations,
      getTakeActionItems,
      groupsSelector,
      inspect,
      isLoadingGroups,
      loading,
      pagination,
      renderChildComponent,
      selectedGroup,
    ]
  );

  if (isEmpty(selectedPatterns)) {
    return null;
  }

  return groupedAlerts;
};

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State) => {
    const globalInputs: inputsModel.InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;
    return {
      globalQuery: query,
      globalFilters: filters,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const GroupedAlertsTable = connector(React.memo(GroupedAlertsTableComponent));
