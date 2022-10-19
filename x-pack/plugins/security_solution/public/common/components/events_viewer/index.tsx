/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React, {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useState,
  Suspense,
  lazy,
  useContext,
} from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch, useSelector } from 'react-redux';
import { isEmpty } from 'lodash/fp';
import { i18n } from '@kbn/i18n';

import styled, { ThemeContext } from 'styled-components';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { EntityType, RowRenderer } from '@kbn/timelines-plugin/common';
import type {
  BrowserFields,
  Direction,
  EntityType,
  TimelineItem,
  TimelineNonEcsData,
} from '@kbn/timelines-plugin/common';
import { getCombinedFilterQuery } from '@kbn/timelines-plugin/public/components/t_grid/helpers';
import type {
  ColumnHeaderOptions,
  FieldBrowserOptions,
  SetEventsDeleted,
  SetEventsLoading,
  TGridCellAction,
} from '@kbn/timelines-plugin/common/types';
import type { EuiDataGridCellValueElementProps, EuiDataGridControlColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { AlertConsumers, ALERT_RULE_CONSUMER, ALERT_RULE_PRODUCER } from '@kbn/rule-data-utils';
import { defaultHeaders } from '@kbn/timelines-plugin/public/store/t_grid/defaults';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { getPageRowIndex } from '@kbn/timelines-plugin/public';
import {
  addBuildingBlockStyle,
  getEventIdToDataMapping,
} from '@kbn/timelines-plugin/public/components/t_grid/body/helpers';
import { RowAction } from '@kbn/timelines-plugin/public/components/t_grid/body/row_action';
import type { TGridModel, TimelineState } from '@kbn/timelines-plugin/public/store/t_grid';
import { resolverIsShowing } from '../../../timelines/components/timeline/helpers';
import { useBulkAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_bulk_add_to_case_actions';
import type { inputsModel, State } from '../../store';
import { inputsActions } from '../../store/actions';
import type {
  ControlColumnProps,
  OnRowSelected,
  OnSelectAll,
  RowRenderer,
  SortColumnTimeline,
} from '../../../../common/types/timeline';
import { TimelineTabs } from '../../../../common/types/timeline';
import { APP_UI_ID } from '../../../../common/constants';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { InspectButton, InspectButtonContainer } from '../inspect';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { eventsViewerSelector } from './selectors';
import type { SourcererScopeName } from '../../store/sourcerer/model';
import { useSourcererDataView } from '../../containers/sourcerer';
import type { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { FIELDS_WITHOUT_CELL_ACTIONS } from '../../lib/cell_actions/constants';
import { useKibana } from '../../lib/kibana';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import type { FieldEditorActions } from '../../../timelines/components/fields_browser';
import { useFieldBrowserOptions } from '../../../timelines/components/fields_browser';
import { getRowRenderer } from '../../../timelines/components/timeline/body/renderers/get_row_renderer';
import {
  useSessionViewNavigation,
  useSessionView,
} from '../../../timelines/components/timeline/session_tab_content/use_session_view';
import type { SubsetTGridModel } from '../../store/data_table/model';
import type { ViewSelection } from '../event_rendered_view/selector';
import { SummaryViewSelector } from '../event_rendered_view/selector';
import { EventRenderedView } from '../event_rendered_view';
import { AlertCount } from './styles';
import { useTimelineEvents } from './use_timelines_events';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { checkBoxControlColumn } from '../control_columns';

const EmptyHeaderCellRender: ComponentType = () => null;

const transformControlColumns = ({
  columnHeaders,
  controlColumns,
  data,
  fieldBrowserOptions,
  isEventViewer = false,
  loadingEventIds,
  onRowSelected,
  onRuleChange,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
  isSelectAllChecked,
  onSelectPage,
  browserFields,
  pageSize,
  sort,
  theme,
  setEventsLoading,
  setEventsDeleted,
  hasAlertsCrudPermissions,
}: {
  columnHeaders: ColumnHeaderOptions[];
  controlColumns: ControlColumnProps[];
  data: TimelineItem[];
  disabledCellActions: string[];
  fieldBrowserOptions?: FieldBrowserOptions;
  isEventViewer?: boolean;
  loadingEventIds: string[];
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  selectedEventIds: Record<string, TimelineNonEcsData[]>;
  showCheckboxes: boolean;
  tabType: TimelineTabs;
  timelineId: string;
  isSelectAllChecked: boolean;
  browserFields: BrowserFields;
  onSelectPage: OnSelectAll;
  pageSize: number;
  sort: SortColumnTimeline[];
  theme: EuiTheme;
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  hasAlertsCrudPermissions?: ({
    ruleConsumer,
    ruleProducer,
  }: {
    ruleConsumer: string;
    ruleProducer?: string;
  }) => boolean;
}): EuiDataGridControlColumn[] =>
  controlColumns.map(({ id: columnId, headerCellRender = EmptyHeaderCellRender, width }, i) => ({
    id: `${columnId}`,
    headerCellRender: () => {
      const HeaderActions = headerCellRender;
      return (
        <>
          {HeaderActions && (
            <HeaderActions
              width={width}
              browserFields={browserFields}
              fieldBrowserOptions={fieldBrowserOptions}
              columnHeaders={columnHeaders}
              isEventViewer={isEventViewer}
              isSelectAllChecked={isSelectAllChecked}
              onSelectAll={onSelectPage}
              showEventsSelect={false}
              showSelectAllCheckbox={showCheckboxes}
              sort={sort}
              tabType={tabType}
              timelineId={timelineId}
            />
          )}
        </>
      );
    },
    rowCellRender: ({
      isDetails,
      isExpandable,
      isExpanded,
      rowIndex,
      colIndex,
      setCellProps,
    }: EuiDataGridCellValueElementProps) => {
      const pageRowIndex = getPageRowIndex(rowIndex, pageSize);
      const rowData = data[pageRowIndex];

      let disabled = false;
      if (rowData) {
        addBuildingBlockStyle(rowData.ecs, theme, setCellProps);
        if (columnId === 'checkbox-control-column' && hasAlertsCrudPermissions != null) {
          // FUTURE ENGINEER, the assumption here is you can only have one producer and consumer at this time
          const ruleConsumers =
            rowData.data.find((d) => d.field === ALERT_RULE_CONSUMER)?.value ?? [];
          const ruleProducers =
            rowData.data.find((d) => d.field === ALERT_RULE_PRODUCER)?.value ?? [];
          disabled = !hasAlertsCrudPermissions({
            ruleConsumer: ruleConsumers.length > 0 ? ruleConsumers[0] : '',
            ruleProducer: ruleProducers.length > 0 ? ruleProducers[0] : undefined,
          });
        }
      } else {
        // disable the cell when it has no data
        setCellProps({ style: { display: 'none' } });
      }

      return (
        <RowAction
          columnId={columnId ?? ''}
          columnHeaders={columnHeaders}
          controlColumn={controlColumns[i]}
          data={data}
          disabled={disabled}
          index={i}
          isDetails={isDetails}
          isExpanded={isExpanded}
          isEventViewer={isEventViewer}
          isExpandable={isExpandable}
          loadingEventIds={loadingEventIds}
          onRowSelected={onRowSelected}
          onRuleChange={onRuleChange}
          rowIndex={rowIndex}
          colIndex={colIndex}
          pageRowIndex={pageRowIndex}
          selectedEventIds={selectedEventIds}
          setCellProps={setCellProps}
          showCheckboxes={showCheckboxes}
          tabType={tabType}
          timelineId={timelineId}
          width={width}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />
      );
    },
    width,
  }));

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));
const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export const UpdatedFlexGroup = styled(EuiFlexGroup)<{ $view?: ViewSelection }>`
  ${({ $view, theme }) => ($view === 'gridView' ? `margin-right: ${theme.eui.euiSizeXL};` : '')}
  position: absolute;
  z-index: ${({ theme }) => theme.eui.euiZLevel1 - 3};
  right: 0px;
`;

export const UpdatedFlexItem = styled(EuiFlexItem)<{ $show: boolean }>`
  ${({ $show }) => ($show ? '' : 'visibility: hidden;')}
`;

const TitleText = styled.span`
  margin-right: 12px;
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

export interface Props {
  defaultCellActions?: TGridCellAction[];
  defaultModel: SubsetTGridModel;
  end: string;
  entityType: EntityType;
  tableId: TableId;
  leadingControlColumns: ControlColumnProps[];
  scopeId: SourcererScopeName;
  start: string;
  showTotalCount?: boolean;
  pageFilters?: Filter[];
  currentFilter?: Status;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  additionalFilters?: React.ReactNode;
  hasAlertsCrud?: boolean;
  unit?: (n: number) => string;
}

export type StatefulEventsViewerProps = Props & PropsFromRedux;

export const ALERTS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.timelines.timeline.alertsUnit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

const defaultUnit = (n: number) => ALERTS_UNIT(n);

/**
 * The stateful events viewer component is the highest level component that is utilized across the security_solution pages layer where
 * timeline is used BESIDES the flyout. The flyout makes use of the `EventsViewer` component which is a subcomponent here
 * NOTE: As of writting, it is not used in the Case_View component
 */
const StatefulEventsViewerComponent: React.FC<StatefulEventsViewerProps> = ({
  defaultCellActions,
  defaultModel,
  end,
  entityType,
  tableId,
  leadingControlColumns,
  pageFilters,
  currentFilter,
  onRuleChange,
  renderCellValue,
  rowRenderers,
  start,
  scopeId,
  additionalFilters,
  hasAlertsCrud = false,
  unit = defaultUnit,
  clearSelected,
  showCheckboxes,
  isSelectAllChecked,
  setSelected,
  loadingEventIds,
  selectedEventIds,
  excludedRowRendererIds,
}) => {
  const dispatch = useDispatch();
  const {
    filters,
    input,
    query,
    globalQueries,
    dataTable: {
      columns,
      defaultColumns,
      deletedEventIds,
      graphEventId, // If truthy, the graph viewer (Resolver) is showing
      itemsPerPage,
      itemsPerPageOptions,
      sessionViewConfig,
      sort,
    } = defaultModel,
  } = useSelector((state: State) => eventsViewerSelector(state, tableId));

  const { timelines: timelinesUi, data, uiSettings } = useKibana().services;
  const {
    browserFields,
    dataViewId,
    indexPattern,
    runtimeMappings,
    selectedPatterns,
    dataViewId: selectedDataViewId,
    loading: isLoadingIndexPattern,
  } = useSourcererDataView(scopeId);

  const { globalFullScreen } = useGlobalFullScreen();
  const tGridEventRenderedViewEnabled = useIsExperimentalFeatureEnabled(
    'tGridEventRenderedViewEnabled'
  );
  const editorActionsRef = useRef<FieldEditorActions>(null);

  useEffect(() => {
    dispatch(
      dataTableActions.createTGrid({
        columns,
        dataViewId: selectedDataViewId,
        defaultColumns,
        id: tableId,
        indexNames: selectedPatterns,
        itemsPerPage,
        showCheckboxes,
        sort,
      })
    );

    return () => {
      dispatch(inputsActions.deleteOneQuery({ id, inputId: 'global' }));
      if (editorActionsRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        editorActionsRef.current.closeEditor();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalFilters = useMemo(() => [...filters, ...(pageFilters ?? [])], [filters, pageFilters]);
  const { Navigation } = useSessionViewNavigation({
    scopeId: tableId,
  });

  const { DetailsPanel, SessionView } = useSessionView({
    entityType,
    scopeId: tableId,
  });

  const graphOverlay = useMemo(() => {
    const shouldShowOverlay =
      (graphEventId != null && graphEventId.length > 0) || sessionViewConfig != null;
    return shouldShowOverlay ? (
      <GraphOverlay scopeId={tableId} SessionView={SessionView} Navigation={Navigation} />
    ) : null;
  }, [graphEventId, tableId, sessionViewConfig, SessionView, Navigation]);
  const setQuery = useCallback(
    (inspect, loading, refetch) => {
      dispatch(inputsActions.setQuery({ id, inputId: 'global', inspect, loading, refetch }));
      inputsActions.setQuery({
        id: tableId,
        inputId: InputsModelId.global,
        inspect,
        loading,
        refetch,
      });
    },
    [dispatch, tableId]
  );

  const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  };

  const addToCaseBulkActions = useBulkAddToCaseActions();
  const bulkActions = useMemo(
    () => ({
      onAlertStatusActionSuccess: () => {
        refetchQuery(globalQueries);
      },
      customBulkActions: addToCaseBulkActions,
    }),
    [addToCaseBulkActions, globalQueries]
  );

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope: scopeId,
    editorActionsRef,
    upsertColumn: (column, index) =>
      dispatch(dataTableActions.upsertColumn({ column, id: tableId, index })),
    removeColumn: (columnId) => dispatch(dataTableActions.removeColumn({ columnId, id: tableId })),
  });
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);

  const { queryFields, title } = useDeepEqualSelector((state) =>
    getManageTimeline(state, id ?? '')
  );

  const fields = useMemo(
    () => [...columnsHeader.map((c) => c.id), ...(queryFields ?? [])],
    [columnsHeader, queryFields]
  );

  const esQueryConfig = getEsQueryConfig(uiSettings);

  const filterQuery = useMemo(
    () =>
      getCombinedFilterQuery({
        config: esQueryConfig,
        browserFields,
        dataProviders,
        filters,
        from: start,
        indexPattern,
        kqlMode,
        kqlQuery: query,
        to: end,
      }),
    [esQueryConfig, dataProviders, indexPattern, browserFields, filters, start, end, query, kqlMode]
  );

  const sortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
        esTypes: esTypes ?? [],
      })),
    [sort]
  );

  const canQueryTimeline = useMemo(
    () =>
      filterQuery != null &&
      isLoadingIndexPattern != null &&
      !isLoadingIndexPattern &&
      !isEmpty(start) &&
      !isEmpty(end),
    [isLoadingIndexPattern, filterQuery, start, end]
  );

  const [loading, { events, loadPage, pageInfo, refetch, totalCount = 0 }] = useTimelineEvents({
    alertConsumers: [AlertConsumers.SIEM],
    data,
    dataViewId,
    endDate: end,
    entityType,
    fields,
    filterQuery,
    id,
    indexNames: selectedPatterns,
    limit: itemsPerPage,
    runtimeMappings,
    skip: !canQueryTimeline,
    sort: sortField,
    startDate: start,
  });

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const isLive = input.policy.kind === 'interval';
  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);
  const [tableView, setTableView] = useState<ViewSelection>('gridView');
  const alignItems = tableView === 'gridView' ? 'baseline' : 'center';

  const alertCountText = useMemo(
    () => `${totalCount.toLocaleString()} ${unit(totalCount)}`,
    [totalCount, unit]
  );

  const showAlertStatusActions = useMemo(() => {
    if (!hasAlertsCrud) {
      return false;
    }
    if (typeof bulkActions === 'boolean') {
      return bulkActions;
    }
    return true;
  }, [bulkActions, hasAlertsCrud]);

  const additionalBulkActions = useMemo(() => {
    if (bulkActions && bulkActions.customBulkActions !== undefined) {
      return bulkActions.customBulkActions.map((action) => {
        return {
          ...action,
          onClick: (eventIds: string[]) => {
            const items = events.filter((item) => {
              return eventIds.find((event) => item._id === event);
            });
            action.onClick(items);
          },
        };
      });
    }
  }, [bulkActions, events]);

  const onAlertStatusActionSuccess = useMemo(() => {
    if (bulkActions) {
      return bulkActions.onAlertStatusActionSuccess;
    }
  }, [bulkActions]);

  const alertToolbar = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <AlertCount>{alertCountText}</AlertCount>
        </EuiFlexItem>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <StatefulAlertBulkActions
            showAlertStatusActions={showAlertStatusActions}
            data-test-subj="bulk-actions"
            id={id}
            totalItems={totalCountMinusDeleted}
            filterStatus={currentFilter}
            query={filterQuery}
            indexName={selectedPatterns.join()}
            onActionSuccess={onAlertStatusActionSuccess}
            customBulkActions={additionalBulkActions}
            refetch={refetch}
          />
        </Suspense>
      </EuiFlexGroup>
    ),
    [
      additionalBulkActions,
      alertCountText,
      filterQuery,
      currentFilter,
      id,
      selectedPatterns,
      onAlertStatusActionSuccess,
      refetch,
      showAlertStatusActions,
      totalCountMinusDeleted,
    ]
  );

  const onChangePage = useCallback(
    (page) => {
      loadPage(page);
    },
    [loadPage]
  );

  const onChangeItemsPerPage = useCallback(
    (itemsChangedPerPage) => {
      dispatch(timelineActions.updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage }));
    },
    [id, dispatch]
  );
  const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

  const theme: EuiTheme = useContext(ThemeContext);
  const onRowSelected: OnRowSelected = useCallback(
    ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
      setSelected({
        id,
        eventIds: getEventIdToDataMapping(events, eventIds, queryFields, hasAlertsCrud ?? false),
        isSelected,
        isSelectAllChecked: isSelected && selectedCount + 1 === events.length,
      });
    },
    [id, events, queryFields, hasAlertsCrud, selectedCount, setSelected]
  );

  const onSelectPage: OnSelectAll = useCallback(
    ({ isSelected }: { isSelected: boolean }) =>
      isSelected
        ? setSelected({
            id,
            eventIds: getEventIdToDataMapping(
              events,
              events.map((event) => event._id),
              queryFields,
              hasAlertsCrud ?? false
            ),
            isSelected,
            isSelectAllChecked: isSelected,
          })
        : clearSelected({ id }),
    [id, events, queryFields, hasAlertsCrud, setSelected, clearSelected]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(timelineActions.setEventsLoading({ id, eventIds, isLoading }));
    },
    [dispatch, id]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(timelineActions.setEventsDeleted({ id, eventIds, isDeleted }));
    },
    [dispatch, id]
  );

  const [leadingTGridControlColumns] = useMemo(() => {
    const controlColumns = showCheckboxes
      ? [checkBoxControlColumn, ...leadingControlColumns]
      : leadingControlColumns;
    return transformControlColumns({
      columnHeaders: columnsHeader,
      controlColumns,
      data: events,
      disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
      fieldBrowserOptions,
      isEventViewer: tableView === 'eventRenderedView',
      loadingEventIds,
      onRowSelected,
      onRuleChange,
      selectedEventIds,
      showCheckboxes,
      tabType: TimelineTabs.query,
      timelineId: id,
      isSelectAllChecked,
      sort,
      browserFields,
      onSelectPage,
      theme,
      setEventsLoading,
      setEventsDeleted,
      pageSize: itemsPerPage,
    });
  }, [
    columnsHeader,
    showCheckboxes,
    leadingControlColumns,
    events,
    fieldBrowserOptions,
    tableView,
    loadingEventIds,
    onRowSelected,
    onRuleChange,
    selectedEventIds,
    id,
    isSelectAllChecked,
    sort,
    browserFields,
    onSelectPage,
    theme,
    setEventsLoading,
    setEventsDeleted,
    itemsPerPage,
  ]);
  return (
    <>
      <FullScreenContainer $isFullScreen={globalFullScreen}>
        <InspectButtonContainer>
          <UpdatedFlexGroup
            alignItems={alignItems}
            data-test-subj="updated-flex-group"
            gutterSize="m"
            justifyContent="flexEnd"
            $view={tableView}
          >
            <UpdatedFlexItem grow={false} $show={!loading}>
              <InspectButton title={justTitle} queryId={'test'} />
            </UpdatedFlexItem>
            <UpdatedFlexItem grow={false} $show={!loading}>
              {!resolverIsShowing(graphEventId) && additionalFilters}
            </UpdatedFlexItem>
            {tGridEventRenderedViewEnabled &&
              ['detections-page', 'detections-rules-details-page'].includes(id) && (
                <UpdatedFlexItem grow={false} $show={!loading}>
                  <SummaryViewSelector viewSelected={tableView} onViewChange={setTableView} />
                </UpdatedFlexItem>
              )}
          </UpdatedFlexGroup>
          <FullWidthFlexGroup $visible={!graphEventId} gutterSize="none">
            <ScrollableFlexItem grow={1}>
              {tableView === 'gridView' &&
                timelinesUi.getTGrid<'embedded'>({
                  appId: APP_UI_ID,
                  browserFields,
                  bulkActions,
                  columns,
                  dataProviders,
                  dataViewId,
                  defaultCellActions,
                  deletedEventIds,
                  disabledCellActions: FIELDS_WITHOUT_CELL_ACTIONS,
                  end,
                  entityType,
                  fieldBrowserOptions,
                  filters: globalFilters,
                  filterStatus: currentFilter,
                  getRowRenderer,
                  globalFullScreen,
                  hasAlertsCrud,
                  id,
                  indexNames: selectedPatterns,
                  indexPattern,
                  isLive,
                  isLoadingIndexPattern,
                  itemsPerPage,
                  itemsPerPageOptions,
                  kqlMode,
                  leadingControlColumns,
                  onRuleChange,
                  query,
                  renderCellValue,
                  rowRenderers,
                  runtimeMappings,
                  setQuery,
                  sort,
                  start,
                  type: 'embedded',
                  unit,
                })}
              {tableView === 'eventRenderedView' && (
                <EventRenderedView
                  appId={APP_UI_ID}
                  alertToolbar={alertToolbar}
                  events={events}
                  leadingControlColumns={leadingTGridControlColumns ?? []}
                  onChangePage={onChangePage}
                  onChangeItemsPerPage={onChangeItemsPerPage}
                  pageIndex={pageInfo.activePage}
                  pageSize={pageInfo.querySize}
                  pageSizeOptions={itemsPerPageOptions}
                  rowRenderers={rowRenderers}
                  totalItemCount={totalCountMinusDeleted}
                />
              )}
              {graphOverlay}
            </ScrollableFlexItem>
          </FullWidthFlexGroup>
        </InspectButtonContainer>
      </FullScreenContainer>
      {DetailsPanel}
    </>
  );
};

const makeMapStateToProps = () => {
  const getTGrid = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: TimelineState, { id, hasAlertsCrud }: Props) => {
    const timeline: TGridModel = getTGrid(state, id);
    const {
      columns,
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      selectedEventIds,
      showCheckboxes,
      sort,
      isLoading,
    } = timeline;

    return {
      excludedRowRendererIds,
      isSelectAllChecked,
      loadingEventIds,
      isLoading,
      id,
      selectedEventIds,
      showCheckboxes: hasAlertsCrud === true && showCheckboxes,
      sort,
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  clearSelected: timelineActions.clearSelected,
  setSelected: timelineActions.setSelected,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const StatefulEventsViewer: React.FunctionComponent<Props> = connector(
  StatefulEventsViewerComponent
);
