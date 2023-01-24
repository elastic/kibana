/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isArray } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTablePagination,
} from '@elastic/eui';
import styled from 'styled-components';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { GroupRightPanel } from '../../../common/components/grouping/accordion_panel/group_stats';
import { GROUPS_UNIT } from '../../../common/components/grouping/translations';
import { defaultUnit, UnitCount } from '../../../common/components/toolbar/unit';
import { useBulkActionItems } from '../../../common/components/toolbar/bulk_actions/use_bulk_action_items';
import type { GroupingTableAggregation, RawBucket } from '../../../common/components/grouping';
import { getGroupingQuery, GroupsSelector } from '../../../common/components/grouping';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { combineQueries } from '../../../common/lib/kuery';
import type { AlertWorkflowStatus } from '../../../common/types';
import type {
  CustomBulkActionProp,
  SetEventsDeleted,
  SetEventsLoading,
  TableIdLiteral,
} from '../../../../common/types';
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
import { getSelectedGroupButtonContent } from './groups_buttons_renderers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { getSelectedGroupBadgeMetrics, getSelectedGroupCustomMetrics } from './groups_stats';

/** This local storage key stores the `Grid / Event rendered view` selection */
export const ALERTS_TABLE_GROUPS_SELECTION_KEY = 'securitySolution.alerts.table.group-selection';
const storage = new Storage(localStorage);

export const GroupsContainer = styled.div`
  .euiAccordion__childWrapper {
    border-bottom: 1px solid #d3dae6;
    border-radius: 5px;
  }
  .euiAccordion__triggerWrapper {
    border-bottom: 1px solid #d3dae6;
    border-radius: 5px;
    min-height: 77px;
  }
  .euiAccordionForm {
    border-top: 1px solid #d3dae6;
    border-left: 1px solid #d3dae6;
    border-right: 1px solid #d3dae6;
    border-bottom: none;
    border-radius: 5px;
  }
`;

const ALERTS_GROUPING_ID = '';

const defaultGroupingOptions = [
  {
    label: i18n.ruleName,
    key: 'kibana.alert.rule.name',
  },
  {
    label: i18n.userName,
    key: 'user.name',
  },
  {
    label: i18n.hostName,
    key: 'host.name',
  },
  {
    label: i18n.sourceIP,
    key: 'source.ip',
  },
];

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
  selectedEventIds,
}) => {
  const dispatch = useDispatch();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(
    storage.get(ALERTS_TABLE_GROUPS_SELECTION_KEY)
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

  const getGroupFields = (groupValue: string) => {
    if (groupValue === 'kibana.alert.rule.name') {
      return [groupValue, 'kibana.alert.rule.description'];
    } else {
      return [groupValue];
    }
  };

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

  const [activePage, setActivePage] = useState<number>(0);
  const [groupsPageSize, setShowPerPageOptions] = useState<number>(25);

  const queryGroups = useMemo(
    () =>
      getGroupingQuery({
        additionalFilters,
        additionalAggregationsRoot: [
          {
            alertsCount: {
              terms: {
                field: 'kibana.alert.rule.producer',
                exclude: ['alerts'],
              },
            },
          },
          ...(selectedGroup
            ? [
                {
                  groupsNumber: {
                    cardinality: {
                      field: selectedGroup,
                    },
                  },
                },
              ]
            : []),
        ],
        from,
        runtimeMappings,
        stackByMupltipleFields0: selectedGroup ? getGroupFields(selectedGroup) : [],
        to,
        additionalStatsAggregationsFields0: [
          {
            countSeveritySubAggregation: {
              cardinality: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            severitiesSubAggregation: {
              terms: {
                field: 'kibana.alert.severity',
              },
            },
          },
          {
            usersCountAggregation: {
              cardinality: {
                field: 'user.name',
              },
            },
          },
          {
            hostsCountAggregation: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
          {
            alertsCount: {
              cardinality: {
                field: 'kibana.alert.uuid',
              },
            },
          },
          {
            ruleTags: {
              terms: {
                field: 'kibana.alert.rule.tags',
              },
            },
          },
          {
            rulesCountAggregation: {
              cardinality: {
                field: 'kibana.alert.rule.rule_id',
              },
            },
          },
        ],
        stackByMupltipleFields0Size: groupsPageSize,
        stackByMupltipleFields0From: activePage * groupsPageSize,
        additionalStatsAggregationsFields1: [],
        stackByMupltipleFields1: [],
      }),
    [additionalFilters, selectedGroup, from, runtimeMappings, to, groupsPageSize, activePage]
  );

  const [trigger, setTrigger] = useState<
    Record<string, { state: 'open' | 'closed' | undefined; selectedBucket: RawBucket }>
  >({});
  const [selectedBucket, setSelectedBucket] = useState<RawBucket>();

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
  });

  useEffect(() => {
    setAlertsQuery(queryGroups);
  }, [queryGroups, setAlertsQuery]);

  useInspectButton({
    deleteQuery,
    loading: isLoadingGroups,
    response,
    setQuery,
    refetch,
    request,
    uniqueQueryId,
  });

  const [options, setOptions] = useState(defaultGroupingOptions);

  const groupsSelector = useMemo(
    () => (
      <GroupsSelector
        groupSelected={selectedGroup}
        onGroupChange={(groupSelection?: string) => {
          storage.set(ALERTS_TABLE_GROUPS_SELECTION_KEY, groupSelection);
          setActivePage(0);
          setSelectedGroup(groupSelection);
          if (groupSelection && !options.find((o) => o.key === groupSelection)) {
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
          setSelectedGroup(undefined);
          setOptions(defaultGroupingOptions);
        }}
        fields={indexPatterns.fields}
        options={options}
      />
    ),
    [indexPatterns.fields, options, selectedGroup]
  );

  const getGlobalQuerySelector = inputsSelectors.globalQuery();
  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);
  const refetchQuery = useCallback(() => {
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [globalQueries]);

  const onUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      refetchQuery();
    },
    [refetchQuery]
  );

  const onUpdateFailure = useCallback(
    (newStatus: AlertWorkflowStatus, error: Error) => {
      refetchQuery();
    },
    [refetchQuery]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(dataTableActions.setEventsLoading({ id: tableId, eventIds, isLoading }));
    },
    [dispatch, tableId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(dataTableActions.setEventsDeleted({ id: tableId, eventIds, isDeleted }));
    },
    [dispatch, tableId]
  );

  const groupFiltersMemo = useMemo(() => {
    const groupFilters = [];
    if (selectedBucket && selectedGroup) {
      groupFilters.push({
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: selectedGroup,
          params: {
            query: isArray(selectedBucket.key) ? selectedBucket.key[0] : selectedBucket.key,
          },
        },
        query: {
          match_phrase: {
            [selectedGroup]: {
              query: isArray(selectedBucket.key) ? selectedBucket.key[0] : selectedBucket.key,
            },
          },
        },
      });
    }
    return groupFilters;
  }, [selectedBucket, selectedGroup]);

  const globalQueryWithGroup = useMemo(
    () => getGlobalQuery([...(defaultFiltersMemo ?? []), ...groupFiltersMemo]),
    [defaultFiltersMemo, getGlobalQuery, groupFiltersMemo]
  );

  const bulkActionItems = useBulkActionItems({
    indexName: indexPatterns.title,
    eventIds: Object.keys(selectedEventIds),
    currentStatus: filterGroup as AlertWorkflowStatus,
    setEventsLoading,
    setEventsDeleted,
    query: globalQueryWithGroup?.filterQuery,
    showAlertStatusActions: hasIndexWrite && hasIndexMaintenance,
    onUpdateSuccess,
    onUpdateFailure,
    customBulkActions: bulkActions.customBulkActions as unknown as CustomBulkActionProp[],
  });

  const onOpenGroupAction = useCallback(
    (bucket: RawBucket, isOpen: boolean) => {
      if (isOpen) {
        setSelectedBucket(bucket);
        dispatch(dataTableActions.setDataTableSelectAll({ id: tableId, selectAll: true }));
      } else {
        setSelectedBucket(undefined);
        dispatch(dataTableActions.setDataTableSelectAll({ id: tableId, selectAll: false }));
      }
    },
    [tableId, dispatch]
  );

  const unitCountText = useMemo(() => {
    const countBuckets = alertsGroupsData?.aggregations?.alertsCount?.buckets;
    return `${(countBuckets && countBuckets.length > 0
      ? countBuckets[0].doc_count ?? 0
      : 0
    ).toLocaleString()} ${defaultUnit(
      countBuckets && countBuckets.length > 0 ? countBuckets[0].doc_count ?? 0 : 0
    )}`;
  }, [alertsGroupsData?.aggregations?.alertsCount?.buckets]);

  const unitGroupsCountText = useMemo(() => {
    return `${(
      alertsGroupsData?.aggregations?.groupsNumber?.value ?? 0
    ).toLocaleString()} ${GROUPS_UNIT(alertsGroupsData?.aggregations?.groupsNumber?.value ?? 0)}`;
  }, [alertsGroupsData?.aggregations?.groupsNumber?.value]);

  const goToPage = (pageNumber: number) => {
    setActivePage(pageNumber);
  };

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
      pageFilters={defaultFiltersMemo ?? []}
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
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            style={{ paddingBottom: 20, paddingTop: 20 }}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem grow={false}>
                  <UnitCount data-test-subj="alert-count">{unitCountText}</UnitCount>
                </EuiFlexItem>
                <EuiFlexItem>
                  <UnitCount data-test-subj="groups-count" style={{ borderRight: 'none' }}>
                    {unitGroupsCountText}
                  </UnitCount>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{groupsSelector}</EuiFlexItem>
          </EuiFlexGroup>
          <GroupsContainer>
            {alertsGroupsData?.aggregations?.stackByMupltipleFields0?.buckets?.map(
              (field0Bucket) => (
                <>
                  <EuiAccordion
                    id={`group0-${field0Bucket.key[0]}`}
                    className="euiAccordionForm"
                    buttonClassName="euiAccordionForm__button"
                    buttonContent={getSelectedGroupButtonContent(selectedGroup, field0Bucket)}
                    extraAction={
                      <GroupRightPanel
                        bucket={field0Bucket}
                        badgeMetricStats={getSelectedGroupBadgeMetrics(selectedGroup, field0Bucket)}
                        customMetricStats={getSelectedGroupCustomMetrics(
                          selectedGroup,
                          field0Bucket
                        )}
                        takeActionItems={bulkActionItems}
                        onTakeActionsOpen={() => onOpenGroupAction(field0Bucket, true)}
                      />
                    }
                    paddingSize="l"
                    onToggle={(isOpen) => {
                      setTrigger({
                        ...trigger,
                        [`group0-${field0Bucket.key[0]}`]: {
                          state: isOpen ? 'open' : 'closed',
                          selectedBucket: field0Bucket,
                        },
                      });
                    }}
                  >
                    {trigger[`group0-${field0Bucket.key[0]}`] &&
                    trigger[`group0-${field0Bucket.key[0]}`].state === 'open' ? (
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
                        pageFilters={[
                          ...(defaultFiltersMemo ?? []),
                          {
                            meta: {
                              alias: null,
                              negate: false,
                              disabled: false,
                              type: 'phrase',
                              key: selectedGroup,
                              params: {
                                query: isArray(
                                  trigger[`group0-${field0Bucket.key[0]}`].selectedBucket.key
                                )
                                  ? trigger[`group0-${field0Bucket.key[0]}`].selectedBucket.key[0]
                                  : trigger[`group0-${field0Bucket.key[0]}`].selectedBucket.key,
                              },
                            },
                            query: {
                              match_phrase: {
                                [selectedGroup]: {
                                  query: isArray(
                                    trigger[`group0-${field0Bucket.key[0]}`].selectedBucket.key
                                  )
                                    ? trigger[`group0-${field0Bucket.key[0]}`].selectedBucket.key[0]
                                    : trigger[`group0-${field0Bucket.key[0]}`].selectedBucket.key,
                                },
                              },
                            },
                          },
                        ]}
                        renderCellValue={RenderCellValue}
                        rowRenderers={defaultRowRenderers}
                        sourcererScope={SourcererScopeName.detections}
                        start={from}
                        additionalRightMenuOptions={!selectedGroup ? [groupsSelector] : []}
                      />
                    ) : null}
                  </EuiAccordion>
                  <EuiSpacer size="s" />
                </>
              )
            )}
            <EuiSpacer size="m" />
            {(alertsGroupsData?.aggregations?.groupsNumber?.value && groupsPageSize
              ? Math.ceil(alertsGroupsData?.aggregations?.groupsNumber?.value / groupsPageSize)
              : 0) > 1 && (
              <EuiTablePagination
                data-test-subj="hostTablePaginator"
                activePage={activePage}
                showPerPageOptions={true}
                itemsPerPage={groupsPageSize}
                onChangeItemsPerPage={(pageSize) => {
                  setShowPerPageOptions(pageSize);
                }}
                pageCount={
                  alertsGroupsData?.aggregations?.groupsNumber?.value && groupsPageSize
                    ? Math.ceil(
                        alertsGroupsData?.aggregations?.groupsNumber?.value / groupsPageSize
                      )
                    : 0
                }
                onChangePage={goToPage}
                itemsPerPageOptions={[10, 25, 50, 100]}
              />
            )}
          </GroupsContainer>
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
    const { isSelectAllChecked, loadingEventIds, selectedEventIds } = table;

    const globalInputs: inputsModel.InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;
    return {
      globalQuery: query,
      globalFilters: filters,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertsTable = connector(React.memo(AlertsTableComponent));
