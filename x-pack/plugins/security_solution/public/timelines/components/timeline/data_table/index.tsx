/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiProgress,
  type EuiDataGridCellValueElementProps,
  type EuiDataGridControlColumn,
  type EuiDataGridCustomBodyProps,
  type EuiDataGridProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { generateFilters } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-plugin/common';
import { flattenHit } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UnifiedDataTableSettingsColumn } from '@kbn/unified-data-table';
import { UnifiedDataTable, useColumns, DataLoadingState } from '@kbn/unified-data-table';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { popularizeField } from '@kbn/unified-data-table/src/utils/popularize_field';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DropType } from '@kbn/dom-drag-drop';
import { DragDrop, DropOverlayWrapper, useDragDropContext } from '@kbn/dom-drag-drop';
import type { UnifiedFieldListSidebarContainerProps } from '@kbn/unified-field-list';
import { FieldsGroupNames, UnifiedFieldListSidebarContainer } from '@kbn/unified-field-list';
import { i18n } from '@kbn/i18n';
import { StatefulEventContext } from '../../../../common/components/events_viewer/stateful_event_context';
import type {
  ExpandedDetailTimeline,
  ExpandedDetailType,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../common/types';
import { timelineActions } from '../../../store/timeline';
import type { TimelineItem } from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana';
import { defaultHeaders } from '../body/column_headers/default_headers';
import type {
  ColumnHeaderOptions,
  OnChangePage,
  RowRenderer,
  SortColumnTimeline,
  ToggleDetailPanel,
} from '../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import type { State, inputsModel } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { DetailsPanel } from '../../side_panel';
import { getDefaultControlColumn } from '../body/control_columns';
import { useLicense } from '../../../../common/hooks/use_license';
import { SecurityCellActionsTrigger } from '../../../../actions/constants';
import { Actions } from '../../../../common/components/header_actions/actions';
import { getColumnHeader } from '../body/column_headers/helpers';
import { eventIsPinned } from '../body/helpers';
import { NOTES_BUTTON_CLASS_NAME } from '../properties/helpers';
import { getFormattedFields } from '../body/renderers/formatted_field';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { timelineBodySelector } from '../body/selectors';
import { plainRowRenderer } from '../body/renderers/plain_row_renderer';
import { RowRendererId } from '../../../../../common/api/timeline';
import ToolbarAdditionalControls from './toolbar_additional_controls';
import { StyledTimelineUnifiedDataTable, progressStyle } from './styles';
import CustomGridBodyControls from './render_custom_body';
import RowDetails from './row_details';
import { DRAG_DROP_FIELD } from './translations';

const DROP_PROPS = {
  value: {
    id: 'dscDropZoneTable',
    humanData: {
      label: DRAG_DROP_FIELD,
    },
  },
  order: [1, 0, 0, 0],
  types: ['field_add'] as DropType[],
};

const getCreationOptions: UnifiedFieldListSidebarContainerProps['getCreationOptions'] = () => {
  return {
    originatingApp: 'security_solution',
    localStorageKeyPrefix: 'examples',
    timeRangeUpdatesType: 'timefilter',
    compressed: true,
    showSidebarToggleButton: true,
    disablePopularFields: true,
    buttonAddFieldToWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.addFieldTooltip', {
        defaultMessage: 'Add field as column',
      }),
    },
    buttonRemoveFieldFromWorkspaceProps: {
      'aria-label': i18n.translate('discover.fieldChooser.discoverField.removeFieldTooltip', {
        defaultMessage: 'Remove field from table',
      }),
    },
    onOverrideFieldGroupDetails: (groupName) => {
      if (groupName === FieldsGroupNames.AvailableFields) {
        return {
          helpText: i18n.translate('discover.fieldChooser.availableFieldsTooltip', {
            defaultMessage: 'Fields available for display in the table.',
          }),
        };
      }
    },
    dataTestSubj: {
      fieldListAddFieldButtonTestSubj: 'dataView-add-field_btn',
      fieldListSidebarDataTestSubj: 'discover-sidebar',
      fieldListItemStatsDataTestSubj: 'dscFieldStats',
      fieldListItemDndDataTestSubjPrefix: 'dscFieldListPanelField',
      fieldListItemPopoverDataTestSubj: 'discoverFieldListPanelPopover',
      fieldListItemPopoverHeaderDataTestSubjPrefix: 'discoverFieldListPanel',
    },
  };
};

export const SAMPLE_SIZE_SETTING = 500;
const DataGridMemoized = React.memo(UnifiedDataTable);

interface Props {
  columns: ColumnHeaderOptions[];
  // renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: string;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  sort: SortColumnTimeline[];
  events: TimelineItem[];
  refetch: inputsModel.Refetch;
  totalCount: number;
  onEventClosed: (args: ToggleDetailPanel) => void;
  expandedDetail: ExpandedDetailTimeline;
  showExpandedDetails: boolean;
  onChangePage: OnChangePage;
  activeTab: TimelineTabs;
  dataLoadingState: DataLoadingState;
  updatedAt: number;
}

export const TimelineDataTableComponent: React.FC<Props> = ({
  columns,
  activeTab,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  rowRenderers,
  sort,
  events,
  refetch,
  dataLoadingState,
  totalCount,
  onEventClosed,
  showExpandedDetails,
  expandedDetail,
  onChangePage,
  updatedAt,
}) => {
  const dispatch = useDispatch();
  const { euiTheme } = useEuiTheme();

  // Store context in state rather than creating object in provider value={} to prevent re-renders caused by a new object being created
  const [activeStatefulEventContext] = useState({
    timelineID: timelineId,
    enableHostDetailsFlyout: true,
    enableIpDetailsFlyout: true,
    tabType: activeTab,
  });

  const {
    services: {
      uiSettings,
      fieldFormats,
      dataViews,
      storage,
      dataViewFieldEditor,
      notifications: { toasts: toastsService },
      application: { capabilities },
      theme,
      data: dataPluginContract,
      uiActions,
      charts,
      core,
    },
  } = useKibana();

  const fieldListSidebarServices: UnifiedFieldListSidebarContainerProps['services'] = useMemo(
    () => ({
      fieldFormats,
      dataViews,
      storage,
      dataViewFieldEditor,
      data: dataPluginContract,
      uiActions,
      charts,
      core,
    }),
    [
      charts,
      core,
      dataPluginContract,
      dataViewFieldEditor,
      dataViews,
      fieldFormats,
      storage,
      uiActions,
    ]
  );

  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const [fetchedPage, setFechedPage] = useState<number>(0);
  const trGroupRef = useRef<HTMLDivElement | null>(null);

  const {
    timeline: {
      eventIdToNoteIds,
      excludedRowRendererIds,
      loadingEventIds,
      selectedEventIds,
      filterManager,
      pinnedEventIds,
    } = timelineDefaults,
  } = useSelector((state: State) => timelineBodySelector(state, timelineId));

  const defaultColumns = useMemo(() => {
    return columns.map((c) => c.id);
  }, [columns]);
  const { browserFields, runtimeMappings, sourcererDataView } = useSourcererDataView(
    SourcererScopeName.timeline
  );

  const dataView = useMemo(() => {
    if (sourcererDataView != null) {
      return new DataView({ spec: sourcererDataView, fieldFormats });
    } else {
      return undefined;
    }
  }, [sourcererDataView, fieldFormats]);

  const onToggleShowNotes = useCallback((event: DataTableRecord) => {
    const eventId = event.id;

    setShowNotes((prevShowNotes) => {
      if (prevShowNotes[eventId]) {
        // notes are closing, so focus the notes button on the next tick, after escaping the EuiFocusTrap
        setTimeout(() => {
          const notesButtonElement = trGroupRef.current?.querySelector<HTMLButtonElement>(
            `.${NOTES_BUTTON_CLASS_NAME}`
          );
          notesButtonElement?.focus();
        }, 0);
      }

      return { ...prevShowNotes, [eventId]: !prevShowNotes[eventId] };
    });
  }, []);

  const isEnterprisePlus = useLicense().isEnterprise();
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord & TimelineItem>();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

  // const { activeStep, isTourShown, incrementStep } = useTourContext();

  /* const isTourAnchor = useMemo(
    () =>
      isTourShown(SecurityStepId.alertsCases) &&
      eventType === 'signal' &&
      isDetectionsAlertsTable(timelineId) &&
      ariaRowindex === 1,
    [isTourShown, ariaRowindex, eventType, timelineId]
  );
  const onExpandEvent = useCallback(() => {
    if (
      isTourAnchor &&
      activeStep === AlertsCasesTourSteps.expandEvent &&
      isTourShown(SecurityStepId.alertsCases)
    ) {
      incrementStep(SecurityStepId.alertsCases);
    }
    onEventDetailsPanelOpened();
  }, [activeStep, incrementStep, isTourAnchor, isTourShown, onEventDetailsPanelOpened]);*/

  /* const onRowSelected: OnRowSelected = useCallback(
    ({ eventIds, isSelected }: { eventIds: string[]; isSelected: boolean }) => {
      dispatch(
        timelineActions.setSelected({
          id,
          eventIds: getEventIdToDataMapping(data, eventIds, queryFields),
          isSelected,
          isSelectAllChecked:
            isSelected && Object.keys(selectedEventIds).length + 1 === data.length,
        })
      );
    },
    [data, dispatch, id, queryFields, selectedEventIds]
  );*/
  const discoverGridRows: Array<DataTableRecord & TimelineItem> = useMemo(
    () =>
      events.map(({ _id, _index, ecs, data }) => {
        const _source = ecs as unknown as Record<string, unknown>;
        const hit = { _id, _index: String(_index), _source };
        return {
          _id,
          id: _id,
          data,
          ecs,
          raw: hit,
          flattened: flattenHit(hit, dataView, {
            includeIgnoredValues: true,
          }),
        };
      }),
    [events, dataView]
  );

  const setEventsLoading = useCallback<SetEventsLoading>(
    ({ eventIds, isLoading }) => {
      dispatch(timelineActions.setEventsLoading({ id: timelineId, eventIds, isLoading }));
    },
    [dispatch, timelineId]
  );

  const setEventsDeleted = useCallback<SetEventsDeleted>(
    ({ eventIds, isDeleted }) => {
      dispatch(timelineActions.setEventsDeleted({ id: timelineId, eventIds, isDeleted }));
    },
    [dispatch, timelineId]
  );
  const handleOnEventDetailPanelOpened = useCallback(
    (eventData: DataTableRecord & TimelineItem) => {
      const updatedExpandedDetail: ExpandedDetailType = {
        panelView: 'eventDetail',
        params: {
          eventId: eventData.id,
          indexName: eventData._index ?? '', // TODO: fix type error
          refetch,
        },
      };

      dispatch(
        timelineActions.toggleDetailPanel({
          ...updatedExpandedDetail,
          tabType: TimelineTabs.query,
          id: timelineId,
        })
      );

      activeTimeline.toggleExpandedDetail({ ...updatedExpandedDetail });
    },
    [dispatch, refetch, timelineId]
  );

  const leadingControlColumns = useMemo(
    () =>
      getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellProps: {
          ...x.headerCellProps,
        },
        rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
          if (expandedDoc && expandedDoc.id === discoverGridRows[cveProps.rowIndex].id) {
            cveProps.setCellProps({
              className: 'dscDocsGrid__cell--expanded',
            });
          } else {
            cveProps.setCellProps({ style: undefined });
          }
          return (
            <Actions
              ariaRowindex={cveProps.rowIndex}
              columnId={cveProps.columnId}
              data={discoverGridRows[cveProps.rowIndex].data}
              index={cveProps.colIndex}
              rowIndex={cveProps.rowIndex}
              setEventsDeleted={setEventsDeleted}
              checked={Object.keys(selectedEventIds).includes(
                discoverGridRows[cveProps.rowIndex].id
              )}
              isEventPinned={eventIsPinned({
                eventId: discoverGridRows[cveProps.rowIndex].id,
                pinnedEventIds,
              })}
              columnValues={x.columnValues ?? ''}
              ecsData={discoverGridRows[cveProps.rowIndex].ecs}
              eventId={discoverGridRows[cveProps.rowIndex].id}
              eventIdToNoteIds={eventIdToNoteIds}
              loadingEventIds={loadingEventIds}
              onRowSelected={x.onRowSelected}
              showCheckboxes={x.showCheckboxes ?? false}
              showNotes={showNotes[discoverGridRows[cveProps.rowIndex].id]}
              timelineId={timelineId}
              toggleShowNotes={() => onToggleShowNotes(discoverGridRows[cveProps.rowIndex])}
              refetch={refetch}
              setEventsLoading={setEventsLoading}
              isUnifiedDataTable={true}
            />
          );
        },
        headerCellRender: () => <></>,
      })),
    [
      ACTION_BUTTON_COUNT,
      discoverGridRows,
      setEventsDeleted,
      selectedEventIds,
      pinnedEventIds,
      eventIdToNoteIds,
      loadingEventIds,
      showNotes,
      timelineId,
      refetch,
      setEventsLoading,
      expandedDoc,
      onToggleShowNotes,
    ]
  );

  // Sorting
  const sortingColumns = useMemo(() => {
    return (
      (sort?.map((sortingCol) => [
        sortingCol.columnId,
        sortingCol.sortDirection as 'asc' | 'desc',
      ]) as SortOrder[]) || []
    );
  }, [sort]);
  const onSort = useCallback(
    (nextSort: string[][]) => {
      dispatch(
        timelineActions.updateSort({
          id: timelineId,
          sort: nextSort.map(
            ([id, direction]) =>
              ({
                columnId: id,
                columnType: 'keyword',
                sortDirection: direction,
              } as SortColumnTimeline)
          ),
        })
      );
    },
    [dispatch, timelineId]
  );

  const enabledRowRenderers = useMemo(() => {
    if (
      excludedRowRendererIds &&
      excludedRowRendererIds.length === Object.keys(RowRendererId).length
    )
      return [plainRowRenderer];

    if (!excludedRowRendererIds) return rowRenderers;

    return rowRenderers.filter((rowRenderer) => !excludedRowRendererIds.includes(rowRenderer.id));
  }, [excludedRowRendererIds, rowRenderers]);

  const renderCustomGridBody = useCallback(
    ({
      Cell,
      visibleRowData,
      visibleColumns,
      setCustomGridBodyProps,
    }: EuiDataGridCustomBodyProps) => (
      <CustomGridBodyControls
        timelineId={timelineId}
        discoverGridRows={discoverGridRows}
        Cell={Cell}
        visibleColumns={visibleColumns}
        visibleRowData={visibleRowData}
        setCustomGridBodyProps={setCustomGridBodyProps}
        hasAddNotes={showNotes}
        hasRowRenderers={enabledRowRenderers.length > 0}
      />
    ),
    [discoverGridRows, enabledRowRenderers.length, showNotes, timelineId]
  );

  const handleOnPanelClosed = useCallback(() => {
    onEventClosed({ tabType: TimelineTabs.query, id: timelineId });

    if (
      expandedDetail[TimelineTabs.query]?.panelView &&
      timelineId === TimelineId.active &&
      showExpandedDetails
    ) {
      activeTimeline.toggleExpandedDetail({});
    }
  }, [onEventClosed, timelineId, expandedDetail, showExpandedDetails]);

  // The custom row details is actually a trailing control column cell with
  // a hidden header. This is important for accessibility and markup reasons
  // @see https://fuschia-stretch.glitch.me/ for more
  const trailingControlColumns: EuiDataGridProps['trailingControlColumns'] = useMemo(
    () => [
      {
        id: 'row-details',

        // The header cell should be visually hidden, but available to screen readers
        width: 0,
        headerCellRender: () => <></>,
        headerCellProps: { className: 'euiScreenReaderOnly' },

        // The footer cell can be hidden to both visual & SR users, as it does not contain meaningful information
        footerCellProps: { style: { display: 'none' } },

        // When rendering this custom cell, we'll want to override
        // the automatic width/heights calculated by EuiDataGrid
        rowCellRender: ({ setCellProps, rowIndex }) => {
          setCellProps({ style: { width: '100%', height: 'auto' } });
          return (
            <RowDetails
              timelineId={timelineId}
              event={discoverGridRows[rowIndex]}
              rowIndex={rowIndex}
              onToggleShowNotes={onToggleShowNotes}
              rowRenderers={enabledRowRenderers}
              showAddNote={!!showNotes[discoverGridRows[rowIndex].id]}
            />
          );
        },
      },
    ],
    [discoverGridRows, enabledRowRenderers, onToggleShowNotes, showNotes, timelineId]
  );
  const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);
  const { onSetColumns, onAddColumn, onRemoveColumn } = useColumns({
    capabilities,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    dataView: dataView!,
    dataViews,
    setAppState: (newState: { columns: string[]; sort?: string[][] }) => {
      if (newState.sort) {
        onSort(newState.sort);
      } else {
        const columnsStates = newState.columns.map((columnId) =>
          getColumnHeader(columnId, defaultHeaders)
        );
        dispatch(timelineActions.updateColumns({ id: timelineId, columns: columnsStates }));
      }
    },
    useNewFieldsApi: true,
    columns: defaultColumns,
    sort: sortingColumns,
  });

  const onColumnResize = useCallback(
    ({ columnId, width }: { columnId: string; width: number }) => {
      dispatch(
        timelineActions.updateColumnWidth({
          columnId,
          id: timelineId,
          width,
        })
      );
    },
    [dispatch, timelineId]
  );

  const onResizeDataGrid = useCallback(
    (colSettings) => {
      onColumnResize({ columnId: colSettings.columnId, width: Math.round(colSettings.width) });
    },
    [onColumnResize]
  );

  const isTextBasedQuery = false;

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: unknown, operation: '+' | '-') => {
      if (dataView && filterManager) {
        const fieldName = typeof field === 'string' ? field : field.name;
        popularizeField(dataView, fieldName, dataViews, capabilities);
        const newFilters = generateFilters(filterManager, field, values, operation, dataView);
        return filterManager.addFilters(newFilters);
      }
    },
    [filterManager, dataView, dataViews, capabilities]
  );
  const onChangeItemsPerPage = useCallback(
    (itemsChangedPerPage) =>
      dispatch(
        timelineActions.updateItemsPerPage({ id: timelineId, itemsPerPage: itemsChangedPerPage })
      ),
    [dispatch, timelineId]
  );

  const onSetExpandedDoc = useCallback(
    (newDoc?: DataTableRecord) => {
      if (newDoc) {
        const timelineDoc = discoverGridRows.find((r) => r.id === newDoc.id);
        setExpandedDoc(timelineDoc);
        if (timelineDoc) {
          handleOnEventDetailPanelOpened(timelineDoc);
        }
      } else {
        setExpandedDoc(undefined);
      }
    },
    [discoverGridRows, handleOnEventDetailPanelOpened]
  );

  const [{ dragging }] = useDragDropContext();
  const draggingFieldName = dragging?.id;

  const onToggleColumn = useCallback(
    (columnId: string) => {
      dispatch(
        timelineActions.upsertColumn({
          column: getColumnHeader(columnId, defaultHeaders),
          id: timelineId,
          index: 1,
        })
      );
    },
    [dispatch, timelineId]
  );

  const isDropAllowed = useMemo(() => {
    if (!draggingFieldName || defaultColumns.includes(draggingFieldName)) {
      return false;
    }
    return true;
  }, [draggingFieldName, defaultColumns]);

  const onDropFieldToTable = useCallback(() => {
    if (draggingFieldName) {
      onAddColumn(draggingFieldName);
      onToggleColumn(draggingFieldName);
    }
  }, [draggingFieldName, onAddColumn, onToggleColumn]);

  const tableSettings = useMemo(
    () => ({
      columns: columns.reduce((v, s) => {
        if (s.initialWidth) {
          v[s.id] = { width: s.initialWidth };
        }
        return v;
      }, {} as Record<string, UnifiedDataTableSettingsColumn>),
    }),
    [columns]
  );

  const renderDetailsPanel = useCallback(
    () => (
      <DetailsPanel
        browserFields={browserFields}
        handleOnPanelClosed={handleOnPanelClosed}
        runtimeMappings={runtimeMappings}
        tabType={TimelineTabs.query}
        scopeId={timelineId}
        isFlyoutView
      />
    ),
    [browserFields, handleOnPanelClosed, runtimeMappings, timelineId]
  );

  const customRenderers = useMemo(
    () =>
      getFormattedFields({
        dataTableRows: discoverGridRows,
        scopeId: 'timeline',
        headers: columns,
      }),
    [columns, discoverGridRows]
  );

  const handleChangePageClick = useCallback(() => {
    onChangePage(fetchedPage + 1);
    setFechedPage(fetchedPage + 1);
  }, [fetchedPage, onChangePage]);

  const additionalControls = useMemo(
    () => (
      <ToolbarAdditionalControls timelineId={timelineId} columns={columns} updatedAt={updatedAt} />
    ),
    [columns, timelineId, updatedAt]
  );

  const onAddFieldToWorkspace = useCallback(
    (field: DataViewField) => {
      onAddColumn(field.name);
      onToggleColumn(field.name);
    },
    [onAddColumn, onToggleColumn]
  );

  const onRemoveFieldFromWorkspace = useCallback(
    (field: DataViewField) => {
      if (columns.some(({ id }) => id === field.name)) {
        dispatch(
          timelineActions.removeColumn({
            columnId: field.name,
            id: timelineId,
          })
        );
      }
      onRemoveColumn(field.name);
    },
    [columns, dispatch, onRemoveColumn, timelineId]
  );

  if (!dataView) {
    return null;
  }
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <UnifiedFieldListSidebarContainer
          // ref={initializeUnifiedFieldListSidebarContainerApi}
          variant="responsive"
          getCreationOptions={getCreationOptions}
          services={fieldListSidebarServices}
          dataView={dataView}
          allFields={dataView.fields}
          workspaceSelectedFieldNames={defaultColumns}
          onAddFieldToWorkspace={onAddFieldToWorkspace}
          onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
          onAddFilter={onAddFilter}
          onFieldEdited={async (options) => await refetch()}
        />
      </EuiFlexItem>
      <EuiHideFor sizes={['xs', 's']}>
        <EuiFlexItem
          grow={false}
          css={css`
            border-right: ${euiTheme.border.thin};
          `}
        />
      </EuiHideFor>
      <EuiFlexItem>
        <StyledTimelineUnifiedDataTable>
          {dataLoadingState !== DataLoadingState.loaded && (
            <EuiProgress
              data-test-subj="discoverDataGridUpdating"
              size="xs"
              color="accent"
              css={progressStyle}
            />
          )}
          <StatefulEventContext.Provider value={activeStatefulEventContext}>
            <DragDrop
              draggable={false}
              dropTypes={isDropAllowed ? DROP_PROPS.types : undefined}
              value={DROP_PROPS.value}
              order={DROP_PROPS.order}
              onDrop={onDropFieldToTable}
            >
              <DropOverlayWrapper isVisible={isDropAllowed}>
                <DataGridMemoized
                  ariaLabelledBy="timelineDocumentsAriaLabel"
                  className={'udtTimeline'}
                  columns={defaultColumns}
                  expandedDoc={expandedDoc}
                  dataView={dataView}
                  loadingState={dataLoadingState}
                  onFilter={onAddFilter as DocViewFilterFn}
                  onResize={onResizeDataGrid}
                  onSetColumns={onSetColumns}
                  onSort={!isTextBasedQuery ? onSort : undefined}
                  rows={discoverGridRows}
                  sampleSize={SAMPLE_SIZE_SETTING}
                  setExpandedDoc={onSetExpandedDoc}
                  settings={tableSettings}
                  showTimeCol={showTimeCol}
                  isSortEnabled={true}
                  sort={sortingColumns}
                  rowHeightState={3}
                  onUpdateRowHeight={() => {}}
                  isPlainRecord={isTextBasedQuery}
                  rowsPerPageState={itemsPerPage}
                  onUpdateRowsPerPage={onChangeItemsPerPage}
                  onFieldEdited={() => refetch()}
                  cellActionsTriggerId={SecurityCellActionsTrigger.DEFAULT}
                  services={{
                    theme,
                    fieldFormats,
                    storage,
                    toastNotifications: toastsService,
                    uiSettings,
                    dataViewFieldEditor,
                    data: dataPluginContract,
                  }}
                  visibleCellActions={3}
                  externalCustomRenderers={customRenderers}
                  renderDocumentView={renderDetailsPanel}
                  externalControlColumns={
                    leadingControlColumns as unknown as EuiDataGridControlColumn[]
                  }
                  externalAdditionalControls={additionalControls}
                  // trailingControlColumns={trailingControlColumns}
                  // renderCustomGridBody={renderCustomGridBody}
                  rowsPerPageOptions={itemsPerPageOptions}
                  showFullScreenButton={false}
                  useNewFieldsApi={true}
                  maxDocFieldsDisplayed={50}
                  consumer="timeline"
                  totalHits={totalCount}
                  onFetchMoreRecords={handleChangePageClick}
                  configRowHeight={3}
                  showMultiFields={true}
                />
              </DropOverlayWrapper>
            </DragDrop>
          </StatefulEventContext.Provider>
        </StyledTimelineUnifiedDataTable>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TimelineDataTable = React.memo(TimelineDataTableComponent);
// eslint-disable-next-line import/no-default-export
export { TimelineDataTable as default };
