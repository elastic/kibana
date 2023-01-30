/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { InspectButton } from '../../../common/components/inspect';
import { defaultUnit } from '../../../common/components/toolbar/unit';
import type { GroupingTableAggregation, RawBucket } from '../../../common/components/grouping';
import { GroupingContainer, GroupsSelector } from '../../../common/components/grouping';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { combineQueries } from '../../../common/lib/kuery';
import type { AlertWorkflowStatus } from '../../../common/types';
import type { TableIdLiteral } from '../../../../common/types';
import { tableDefaults } from '../../../common/store/data_table/defaults';
import { dataTableActions, dataTableSelectors } from '../../../common/store/data_table';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { StatefulEventsViewer } from '../../../common/components/events_viewer';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useInvalidFilterQuery } from '../../../common/hooks/use_invalid_filter_query';
import { defaultCellActions } from '../../../common/lib/cell_actions/default_cell_actions';
import { useKibana } from '../../../common/lib/kibana';
import type { inputsModel, State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../../timelines/components/timeline/body/constants';
import { getDefaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import { getColumns, RenderCellValue } from '../../configurations/security_solution_detections';
import { useInspectButton } from '../alerts_kpis/common/hooks';

import { AdditionalFiltersAction } from './additional_filters_action';
import {
  getAlertsDefaultModel,
  buildAlertStatusFilter,
  requiredFieldsForActions,
} from './default_config';
import { buildTimeRangeFilter } from './helpers';
import * as i18n from './translations';
import { useLicense } from '../../../common/hooks/use_license';
import { useBulkAddToCaseActions } from './timeline_actions/use_bulk_add_to_case_actions';
import { useAddBulkToTimelineAction } from './timeline_actions/use_add_bulk_to_timeline';
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

/** This local storage key stores the `Grid / Event rendered view` selection */
export const ALERTS_TABLE_GROUPS_SELECTION_KEY = 'securitySolution.alerts.table.group-selection';
const storage = new Storage(localStorage);

const ALERTS_GROUPING_ID = 'alerts-grouping';

interface OwnProps {
  defaultFilters?: Filter[];
  from: string;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  loading: boolean;
  onRuleChange?: () => void;
  onShowBuildingBlockAlertsChanged: (showBuildingBlockAlerts: boolean) => void;
  onShowOnlyThreatIndicatorAlertsChanged: (showOnlyThreatIndicatorAlerts: boolean) => void;
  showBuildingBlockAlerts: boolean;
  showOnlyThreatIndicatorAlerts: boolean;
  tableId: TableIdLiteral;
  to: string;
  filterGroup?: Status;
  runtimeMappings: MappingRuntimeFields;
  signalIndexName: string | null;
}

type AlertsTableComponentProps = OwnProps & PropsFromRedux;

export const AlertsTableComponent: React.FC<AlertsTableComponentProps> = ({
  defaultFilters,
  from,
  globalFilters,
  globalQuery,
  hasIndexMaintenance,
  hasIndexWrite,
  isSelectAllChecked,
  loading,
  loadingEventIds,
  onRuleChange,
  onShowBuildingBlockAlertsChanged,
  onShowOnlyThreatIndicatorAlertsChanged,
  showBuildingBlockAlerts,
  showOnlyThreatIndicatorAlerts,
  tableId,
  to,
  filterGroup,
  runtimeMappings,
  signalIndexName,
}) => {
  const dispatch = useDispatch();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(
    storage.get(`${ALERTS_TABLE_GROUPS_SELECTION_KEY}-${tableId}`)
  );

  const {
    browserFields,
    indexPattern: indexPatterns,
    selectedPatterns,
  } = useSourcererDataView(SourcererScopeName.detections);
  const kibana = useKibana();
  const license = useLicense();
  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 5 : 4;

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

  // Catches state change isSelectAllChecked->false upon user selection change to reset utility bar
  useEffect(() => {
    if (isSelectAllChecked) {
      dispatch(
        dataTableActions.setDataTableSelectAll({
          id: tableId,
          selectAll: false,
        })
      );
    }
  }, [dispatch, isSelectAllChecked, tableId]);

  const additionalFiltersComponent = useMemo(
    () => (
      <AdditionalFiltersAction
        areEventsLoading={loadingEventIds.length > 0}
        onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
        showBuildingBlockAlerts={showBuildingBlockAlerts}
        onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsChanged}
        showOnlyThreatIndicatorAlerts={showOnlyThreatIndicatorAlerts}
      />
    ),
    [
      loadingEventIds.length,
      onShowBuildingBlockAlertsChanged,
      onShowOnlyThreatIndicatorAlertsChanged,
      showBuildingBlockAlerts,
      showOnlyThreatIndicatorAlerts,
    ]
  );

  const defaultFiltersMemo = useMemo(() => {
    let alertStatusFilter: Filter[] = [];
    if (filterGroup) {
      alertStatusFilter = buildAlertStatusFilter(filterGroup);
    }
    if (isEmpty(defaultFilters)) {
      return alertStatusFilter;
    } else if (defaultFilters != null && !isEmpty(defaultFilters)) {
      return [...defaultFilters, ...alertStatusFilter];
    }
  }, [defaultFilters, filterGroup]);

  const { filterManager } = kibana.services.data.query;

  const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');

  useEffect(() => {
    dispatch(
      dataTableActions.initializeDataTableSettings({
        defaultColumns: getColumns(license).map((c) =>
          !tGridEnabled && c.initialWidth == null
            ? {
                ...c,
                initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              }
            : c
        ),
        id: tableId,
        loadingText: i18n.LOADING_ALERTS,
        queryFields: requiredFieldsForActions,
        title: i18n.ALERTS_DOCUMENT_TYPE,
        showCheckboxes: true,
      })
    );
  }, [dispatch, filterManager, tGridEnabled, tableId, license]);

  const leadingControlColumns = useMemo(
    () => getDefaultControlColumn(ACTION_BUTTON_COUNT),
    [ACTION_BUTTON_COUNT]
  );

  const addToCaseBulkActions = useBulkAddToCaseActions();
  const addBulkToTimelineAction = useAddBulkToTimelineAction({
    localFilters: defaultFiltersMemo ?? [],
    tableId,
    from,
    to,
    scopeId: SourcererScopeName.detections,
  });

  const bulkActions = useMemo(
    () => ({
      customBulkActions: [...addToCaseBulkActions, addBulkToTimelineAction],
    }),
    [addToCaseBulkActions, addBulkToTimelineAction]
  );

  const { deleteQuery, setQuery } = useGlobalTime(false);
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `${ALERTS_GROUPING_ID}-${uuidv4()}`, []);

  const additionalFilters = useMemo(() => {
    try {
      return [
        buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
          ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
          ...(defaultFiltersMemo ?? []),
        ]),
      ];
    } catch (e) {
      return [];
    }
  }, [defaultFiltersMemo, globalFilters, globalQuery]);

  const [groupsActivePage, setGroupsActivePage] = useState<number>(0);
  const [groupsItemsPerPage, setGroupsItemsPerPage] = useState<number>(25);

  const pagination = useMemo(
    () => ({
      pageIndex: groupsActivePage,
      pageSize: groupsItemsPerPage,
      onChangeItemsPerPage: (itemsPerPageNumber: number) =>
        setGroupsItemsPerPage(itemsPerPageNumber),
      onChangePage: (pageNumber: number) => setGroupsActivePage(pageNumber),
    }),
    [groupsActivePage, groupsItemsPerPage]
  );

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
    GroupingTableAggregation &
      Record<string, { value?: number | null; buckets?: Array<{ doc_count?: number | null }> }>
  >({
    query: queryGroups,
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.ALERTS_GROUPING,
    skip: !selectedGroup || selectedGroup === 'none',
  });

  useEffect(() => {
    if (selectedGroup) {
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
    () => <InspectButton queryId={uniqueQueryId} inspectIndex={0} title={''} />,
    [uniqueQueryId]
  );

  const defaultGroupingOptions = getDefaultGroupingOptions(tableId);
  const [options, setOptions] = useState(
    defaultGroupingOptions.find((o) => o.key === selectedGroup)
      ? defaultGroupingOptions
      : [
          ...defaultGroupingOptions,
          ...(selectedGroup
            ? [
                {
                  key: selectedGroup,
                  label: selectedGroup,
                },
              ]
            : []),
        ]
  );

  const groupsSelector = useMemo(
    () => (
      <GroupsSelector
        groupSelected={selectedGroup}
        data-test-subj="alerts-table-group-selector"
        onGroupChange={(groupSelection?: string) => {
          storage.set(`${ALERTS_TABLE_GROUPS_SELECTION_KEY}-${tableId}`, groupSelection);
          setGroupsActivePage(0);
          setSelectedGroup(groupSelection);
          if (
            groupSelection &&
            groupSelection !== 'none' &&
            !options.find((o) => o.key === groupSelection)
          ) {
            setOptions([
              ...defaultGroupingOptions,
              {
                label: groupSelection,
                key: groupSelection,
              },
            ]);
          } else {
            setOptions(defaultGroupingOptions);
          }
        }}
        onClearSelected={() => {
          setGroupsActivePage(0);
          setSelectedGroup(undefined);
          setOptions(defaultGroupingOptions);
          storage.set(`${ALERTS_TABLE_GROUPS_SELECTION_KEY}-${tableId}`, undefined);
        }}
        fields={indexPatterns.fields}
        options={options}
        title={i18n.GROUP_ALERTS_SELECTOR}
      />
    ),
    [defaultGroupingOptions, indexPatterns.fields, options, selectedGroup, tableId]
  );

  const takeActionItems = useGroupTakeActionsItems({
    indexName: indexPatterns.title,
    currentStatus: filterGroup as AlertWorkflowStatus,
    showAlertStatusActions: hasIndexWrite && hasIndexMaintenance,
  });

  if (loading || isLoadingGroups || isEmpty(selectedPatterns)) {
    return null;
  }

  const dataTable = (
    <StatefulEventsViewer
      additionalFilters={additionalFiltersComponent}
      currentFilter={filterGroup as AlertWorkflowStatus}
      defaultCellActions={defaultCellActions}
      defaultModel={getAlertsDefaultModel(license)}
      end={to}
      bulkActions={bulkActions}
      hasCrudPermissions={hasIndexWrite && hasIndexMaintenance}
      tableId={tableId}
      leadingControlColumns={leadingControlColumns}
      onRuleChange={onRuleChange}
      pageFilters={defaultFiltersMemo}
      renderCellValue={RenderCellValue}
      rowRenderers={defaultRowRenderers}
      sourcererScope={SourcererScopeName.detections}
      start={from}
      additionalRightMenuOptions={!selectedGroup ? [groupsSelector] : []}
    />
  );

  return (
    <>
      {!selectedGroup ? (
        dataTable
      ) : (
        <>
          <GroupingContainer
            selectedGroup={selectedGroup}
            groupsSelector={groupsSelector}
            inspectButton={inspect}
            takeActionItems={(groupFilters: Filter[]) =>
              takeActionItems(
                getGlobalQuery([...(defaultFiltersMemo ?? []), ...groupFilters])?.filterQuery
              )
            }
            data={alertsGroupsData?.aggregations ?? {}}
            renderChildComponent={(groupFilter) => (
              <StatefulEventsViewer
                additionalFilters={additionalFiltersComponent}
                currentFilter={filterGroup as AlertWorkflowStatus}
                defaultCellActions={defaultCellActions}
                defaultModel={getAlertsDefaultModel(license)}
                end={to}
                bulkActions={bulkActions}
                hasCrudPermissions={hasIndexWrite && hasIndexMaintenance}
                tableId={tableId}
                leadingControlColumns={leadingControlColumns}
                onRuleChange={onRuleChange}
                pageFilters={[...(defaultFiltersMemo ?? []), ...groupFilter]}
                renderCellValue={RenderCellValue}
                rowRenderers={defaultRowRenderers}
                sourcererScope={SourcererScopeName.detections}
                start={from}
                additionalRightMenuOptions={!selectedGroup ? [groupsSelector] : []}
              />
            )}
            unit={defaultUnit}
            pagination={pagination}
            groupPanelRenderer={(fieldBucket: RawBucket) =>
              getSelectedGroupButtonContent(selectedGroup, fieldBucket)
            }
            badgeMetricStats={(fieldBucket: RawBucket) =>
              getSelectedGroupBadgeMetrics(selectedGroup, fieldBucket)
            }
            customMetricStats={(fieldBucket: RawBucket) =>
              getSelectedGroupCustomMetrics(selectedGroup, fieldBucket)
            }
          />
        </>
      )}
    </>
  );
};

const makeMapStateToProps = () => {
  const getDataTable = dataTableSelectors.getTableByIdSelector();
  const getGlobalInputs = inputsSelectors.globalSelector();
  const mapStateToProps = (state: State, ownProps: OwnProps) => {
    const { tableId } = ownProps;
    const table = getDataTable(state, tableId) ?? tableDefaults;
    const { isSelectAllChecked, loadingEventIds } = table;

    const globalInputs: inputsModel.InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;
    return {
      globalQuery: query,
      globalFilters: filters,
      isSelectAllChecked,
      loadingEventIds,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertsTable = connector(React.memo(AlertsTableComponent));
