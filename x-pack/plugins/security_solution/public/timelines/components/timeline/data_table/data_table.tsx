/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EuiDataGridCellProps,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridProps,
} from '@elastic/eui';
import {
  logicalCSS,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import type { JSXElementConstructor } from 'react';
import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { css } from 'styled-components';
import { useDispatch } from 'react-redux';

import { generateFilters } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-plugin/common';
import { flattenHit } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, DocViewFilterFn } from '@kbn/discover-utils/types';
import type { UnifiedDataTableSettingsColumn } from '@kbn/unified-data-table';
import { DataLoadingState, UnifiedDataTable, useColumns } from '@kbn/unified-data-table';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { popularizeField } from '@kbn/unified-data-table/src/utils/popularize_field';
import { i18n } from '@kbn/i18n';
import { FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../../common/constants';
import { EXIT_FULL_SCREEN } from '../../../../common/components/exit_full_screen/translations';
import { isActiveTimeline } from '../../../../helpers';
import type {
  ExpandedDetailTimeline,
  ExpandedDetailType,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../common/types';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
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
import type { inputsModel } from '../../../../common/store';
import { appSelectors } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../common/containers/use_full_screen';
import { activeTimeline } from '../../../containers/active_timeline_context';
import { DetailsPanel } from '../../side_panel';
import { getDefaultControlColumn } from '../body/control_columns';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useLicense } from '../../../../common/hooks/use_license';
import { SecurityCellActionsTrigger } from '../../../../actions/constants';
import { StatefulRowRenderer } from '../body/events/stateful_row_renderer';
import { RowRendererId } from '../../../../../common/api/timeline';
import { Actions } from '../../../../common/components/header_actions/actions';
import { plainRowRenderer } from '../body/renderers/plain_row_renderer';
import { useFieldBrowserOptions } from '../../fields_browser';
import { getColumnHeader } from '../body/column_headers/helpers';
import { StatefulRowRenderersBrowser } from '../../row_renderers_browser';
import { eventIsPinned } from '../body/helpers';
import { NOTES_BUTTON_CLASS_NAME } from '../properties/helpers';
import { EventsTrSupplement } from '../styles';
import { NoteCards } from '../../notes/note_cards';
import type { TimelineResultNote } from '../../open_timeline/types';
import { getFormattedFields } from '../body/renderers/formatted_field';

export const FULL_SCREEN = i18n.translate('xpack.securitySolution.timeline.fullScreenButton', {
  defaultMessage: 'Full screen',
});
/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;
const SAMPLE_SIZE_SETTING = 500;
const DataGridMemoized = React.memo(UnifiedDataTable);

export const isFullScreen = ({
  globalFullScreen,
  isActiveTimelines,
  timelineFullScreen,
}: {
  globalFullScreen: boolean;
  isActiveTimelines: boolean;
  timelineFullScreen: boolean;
}) =>
  (isActiveTimelines && timelineFullScreen) || (isActiveTimelines === false && globalFullScreen);

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
  isQueryLoading: boolean;
  totalCount: number;
  onEventClosed: (args: ToggleDetailPanel) => void;
  expandedDetail: ExpandedDetailTimeline;
  showExpandedDetails: boolean;
  onChangePage: OnChangePage;
}

export const TimelineDataTableComponent: React.FC<Props> = ({
  columns,
  timelineId,
  itemsPerPage,
  itemsPerPageOptions,
  rowRenderers,
  sort,
  events,
  refetch,
  isQueryLoading,
  totalCount,
  onEventClosed,
  showExpandedDetails,
  expandedDetail,
  onChangePage,
}) => {
  const dispatch = useDispatch();
  const { euiTheme } = useEuiTheme();

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
      triggersActionsUi,
      data: dataPluginContract,
    },
  } = useKibana();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();

  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const [fetchedPage, setFechedPage] = useState<number>(0);
  const trGroupRef = useRef<HTMLDivElement | null>(null);

  const getManageTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const currentTimeline = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId ?? TimelineId.active)
  );

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
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();

  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

  const toggleFullScreen = useCallback(() => {
    if (timelineId === TimelineId.active) {
      setTimelineFullScreen(!timelineFullScreen);
    } else {
      setGlobalFullScreen(!globalFullScreen);
    }
  }, [
    timelineId,
    setTimelineFullScreen,
    timelineFullScreen,
    setGlobalFullScreen,
    globalFullScreen,
  ]);
  const fullScreen = useMemo(
    () =>
      isFullScreen({
        globalFullScreen,
        isActiveTimelines: isActiveTimeline(timelineId),
        timelineFullScreen,
      }),
    [globalFullScreen, timelineFullScreen, timelineId]
  );

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
  const noop = () => {};
  const leadingControlColumns = useMemo(
    () =>
      getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellProps: {
          ...x.headerCellProps,
          columnHeaders: defaultHeaders ?? [],
          timelineId: timelineId ?? 'timeline-1',
        },
        rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
          return (
            <Actions
              ariaRowindex={cveProps.rowIndex}
              columnId={cveProps.columnId}
              data={discoverGridRows[cveProps.rowIndex].data}
              index={cveProps.colIndex}
              rowIndex={cveProps.rowIndex}
              setEventsDeleted={setEventsDeleted}
              checked={x.id ? Object.keys(currentTimeline.selectedEventIds).includes(x.id) : false}
              columnValues={x.columnValues ?? ''} // TODO: Fix type error
              ecsData={discoverGridRows[cveProps.rowIndex].ecs}
              eventId={discoverGridRows[cveProps.rowIndex].id}
              eventIdToNoteIds={currentTimeline.eventIdToNoteIds}
              loadingEventIds={currentTimeline.loadingEventIds}
              onRowSelected={x.onRowSelected ?? noop}
              onRuleChange={noop} // TODO: get refreshRule
              showCheckboxes={x.showCheckboxes ?? false}
              showNotes={showNotes[discoverGridRows[cveProps.rowIndex].id]}
              timelineId={timelineId}
              toggleShowNotes={() => onToggleShowNotes(discoverGridRows[cveProps.rowIndex])}
              refetch={refetch}
              setEventsLoading={setEventsLoading}
            />
          );
        },
        headerCellRender: () => <></>,
      })),
    [
      ACTION_BUTTON_COUNT,
      currentTimeline.eventIdToNoteIds,
      currentTimeline.loadingEventIds,
      currentTimeline.selectedEventIds,
      discoverGridRows,
      onToggleShowNotes,
      refetch,
      setEventsDeleted,
      setEventsLoading,
      showNotes,
      timelineId,
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

  const associateNote = useCallback(
    (noteId: string, event: DataTableRecord) => {
      dispatch(timelineActions.addNoteToEvent({ eventId: event.id, id: timelineId, noteId }));
      const isEventPinned = eventIsPinned({
        eventId: event.id,
        pinnedEventIds: currentTimeline.pinnedEventIds,
      });
      if (!isEventPinned) {
        dispatch(timelineActions.pinEvent({ id: timelineId, eventId: event.id }));
      }
    },
    [dispatch, currentTimeline.pinnedEventIds, timelineId]
  );

  const renderVisibleCols = useCallback(
    (
      colIndex: number,
      rowIndex: number,
      Cell: JSXElementConstructor<
        {
          colIndex: number;
          visibleRowIndex: number;
        } & Partial<EuiDataGridCellProps>
      >,
      visibleColumn: EuiDataGridColumn
    ) => {
      // Skip the row details cell - we'll render it manually outside of the flex wrapper
      if (visibleColumn.id.includes('timeline')) {
        return (
          <Cell colIndex={colIndex} visibleRowIndex={rowIndex} key={`${rowIndex},${colIndex}`} />
        );
      }
      // Render the rest of the cells normally
      if (visibleColumn.id !== 'row-details') {
        // TODO: using renderCellValue to render the draggable cell. We need to fix the styling though

        // return renderCellValue({
        //   columnId: column.id,
        //   eventId: discoverGridRows[rowIndex]._id,
        //   data: discoverGridRows[rowIndex].data,
        //   header: defaultHeaders.find(({ id }) => column.id === id),
        //   isDraggable: true,
        //   isExpandable: true,
        //   isExpanded: false,
        //   isDetails: false,
        //   isTimeline: true,
        //   linkValues: undefined,
        //   rowIndex,
        //   colIndex,
        //   setCellProps: () => {},
        //   scopeId: timelineId,
        //   key: `${timelineId}-query`,
        // });
        return (
          <Cell colIndex={colIndex} visibleRowIndex={rowIndex} key={`${rowIndex},${colIndex}`} />
        );
      }
    },
    []
  );

  const renderCustomGridBody: EuiDataGridProps['renderCustomGridBody'] = useCallback(
    ({ Cell, visibleColumns: visibleCols, visibleRowData, setCustomGridBodyProps }) => {
      // Ensure we're displaying correctly-paginated rows
      const visibleRows = discoverGridRows.slice(visibleRowData.startRow, visibleRowData.endRow);

      // Add styling needed for custom grid body rows
      const styles = {
        row: css`
          ${logicalCSS('width', 'fit-content')};
          ${logicalCSS('border-bottom', euiTheme.border.thin)};
          background-color: ${euiTheme.colors.emptyShade};
        `,
        rowCellsWrapper: css`
          display: flex;
        `,
        rowDetailsWrapper: css`
          text-align: center;
          background-color: ${euiTheme.colors.body};
        `,
      };

      // Set custom props onto the grid body wrapper
      const bodyRef = useRef<HTMLDivElement | null>(null);
      useEffect(() => {
        setCustomGridBodyProps({
          ref: bodyRef,
        });
      }, [setCustomGridBodyProps]);

      return (
        <>
          {visibleRows.map((row, rowIndex) => (
            <div role="row" css={styles.row} key={rowIndex}>
              <div css={styles.rowCellsWrapper}>
                {visibleCols.map((visibleColumn: EuiDataGridColumn, colIndex: number) =>
                  renderVisibleCols(colIndex, rowIndex, Cell, visibleColumn)
                )}
              </div>
              {/* TODO: This renders the last row which is our expandableRow and where we can put row rendering and notes */}
              <div css={styles.rowDetailsWrapper}>
                <Cell
                  colIndex={visibleCols.length - 1} // If the row is being shown, it should always be the last index
                  visibleRowIndex={rowIndex}
                />
              </div>
            </div>
          ))}
        </>
      );
    },
    [
      discoverGridRows,
      euiTheme.border.thin,
      euiTheme.colors.body,
      euiTheme.colors.emptyShade,
      renderVisibleCols,
    ]
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

  const enabledRowRenderers = useMemo(() => {
    if (
      currentTimeline.excludedRowRendererIds &&
      currentTimeline.excludedRowRendererIds.length === Object.keys(RowRendererId).length
    )
      return [plainRowRenderer];

    if (!currentTimeline.excludedRowRendererIds) return rowRenderers;

    return rowRenderers.filter(
      (rowRenderer) => !currentTimeline.excludedRowRendererIds.includes(rowRenderer.id)
    );
  }, [currentTimeline.excludedRowRendererIds, rowRenderers]);

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
  const notesById = useDeepEqualSelector(getNotesByIds);
  const getNotes = useCallback(
    (event: DataTableRecord) => {
      const noteIds: string[] = currentTimeline.eventIdToNoteIds[event.id] || [];
      return appSelectors.getNotes(notesById, noteIds).map((note) => ({
        savedObjectId: note.saveObjectId,
        note: note.note,
        noteId: note.id,
        updated: (note.lastEdit ?? note.created).getTime(),
        updatedBy: note.user,
      })) as unknown as TimelineResultNote[];
    },
    [currentTimeline.eventIdToNoteIds, notesById]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);

  // The custom row details is actually a trailing control column cell with
  // a hidden header. This is important for accessibility and markup reasons
  // @see https://fuschia-stretch.glitch.me/ for more
  const rowDetails: EuiDataGridProps['trailingControlColumns'] = [
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
          <>
            <EventsTrSupplement
              className="siemEventsTable__trSupplement--notes"
              data-test-subj="event-notes-flex-item"
              $display="block"
            >
              <NoteCards
                ariaRowindex={rowIndex + ARIA_ROW_INDEX_OFFSET}
                associateNote={(noteId: string) =>
                  associateNote(noteId, discoverGridRows[rowIndex])
                }
                data-test-subj="note-cards"
                notes={getNotes(discoverGridRows[rowIndex])}
                showAddNote={!!showNotes[discoverGridRows[rowIndex]._id]}
                toggleShowAddNote={() => onToggleShowNotes(discoverGridRows[rowIndex])}
              />
            </EventsTrSupplement>

            <EuiFlexGroup gutterSize="none" justifyContent="center">
              <EuiFlexItem grow={false}>
                <EventsTrSupplement>
                  <StatefulRowRenderer
                    ariaRowindex={rowIndex + ARIA_ROW_INDEX_OFFSET}
                    containerRef={containerRef}
                    event={discoverGridRows[rowIndex] as TimelineItem}
                    lastFocusedAriaColindex={rowIndex - 1}
                    rowRenderers={enabledRowRenderers}
                    timelineId={timelineId}
                  />
                </EventsTrSupplement>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        );
      },
    },
  ];
  const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);
  const { onSetColumns } = useColumns({
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
  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope: SourcererScopeName.timeline,
    upsertColumn: (columnR: ColumnHeaderOptions, indexR: number) =>
      dispatch(timelineActions.upsertColumn({ column: columnR, id: timelineId, index: indexR })),
    removeColumn: (columnId: string) =>
      dispatch(timelineActions.removeColumn({ columnId, id: timelineId })),
  });

  const onResetColumns = useCallback(() => {
    dispatch(timelineActions.updateColumns({ id: timelineId, columns }));
  }, [columns, dispatch, timelineId]);

  const onToggleColumn = useCallback(
    (columnId: string) => {
      if (columns.some(({ id }) => id === columnId)) {
        dispatch(
          timelineActions.removeColumn({
            columnId,
            id: timelineId,
          })
        );
      } else {
        dispatch(
          timelineActions.upsertColumn({
            column: getColumnHeader(columnId, defaultHeaders),
            id: timelineId,
            index: 1,
          })
        );
      }
    },
    [columns, dispatch, timelineId]
  );
  const isTextBasedQuery = false;

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: unknown, operation: '+' | '-') => {
      if (dataView && currentTimeline.filterManager) {
        const fieldName = typeof field === 'string' ? field : field.name;
        popularizeField(dataView, fieldName, dataViews, capabilities);
        const newFilters = generateFilters(
          currentTimeline.filterManager,
          field,
          values,
          operation,
          dataView
        );
        return currentTimeline.filterManager.addFilters(newFilters);
      }
    },
    [currentTimeline.filterManager, dataView, dataViews, capabilities]
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
  const additionalControls = useMemo(
    () => (
      <>
        {' '}
        {triggersActionsUi.getFieldBrowser({
          browserFields,
          columnIds: defaultColumns ?? [],
          onResetColumns,
          onToggleColumn,
          options: fieldBrowserOptions,
        })}
        <StatefulRowRenderersBrowser
          data-test-subj="row-renderers-browser"
          timelineId={timelineId}
        />
        <>
          <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : FULL_SCREEN}>
            <EuiButtonIcon
              aria-label={
                isFullScreen({
                  globalFullScreen,
                  isActiveTimelines: isActiveTimeline(timelineId),
                  timelineFullScreen,
                })
                  ? EXIT_FULL_SCREEN
                  : FULL_SCREEN
              }
              className={fullScreen ? FULL_SCREEN_TOGGLED_CLASS_NAME : ''}
              color={fullScreen ? 'ghost' : 'primary'}
              data-test-subj={
                // a full screen button gets created for timeline and for the host page
                // this sets the data-test-subj for each case so that tests can differentiate between them
                isActiveTimeline(timelineId) ? 'full-screen-active' : 'full-screen'
              }
              iconType="fullScreen"
              onClick={toggleFullScreen}
            />
          </EuiToolTip>
        </>
      </>
    ),
    [
      browserFields,
      defaultColumns,
      fieldBrowserOptions,
      fullScreen,
      globalFullScreen,
      onResetColumns,
      onToggleColumn,
      timelineFullScreen,
      timelineId,
      toggleFullScreen,
      triggersActionsUi,
    ]
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
    setFechedPage(fetchedPage + 1);
    onChangePage(fetchedPage);
  }, [fetchedPage, onChangePage]);

  if (!dataView) {
    return null;
  }
  return (
    <DataGridMemoized
      ariaLabelledBy="timelineDocumentsAriaLabel"
      className={'udtTimeline'}
      columns={defaultColumns}
      expandedDoc={expandedDoc}
      dataView={dataView}
      loadingState={isQueryLoading ? DataLoadingState.loading : DataLoadingState.loaded}
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
      externalControlColumns={leadingControlColumns as unknown as EuiDataGridControlColumn[]}
      externalAdditionalControls={additionalControls}
      trailingControlColumns={rowDetails}
      renderCustomGridBody={renderCustomGridBody}
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
  );
};

export const TimelineDataTable = React.memo(TimelineDataTableComponent);
// eslint-disable-next-line import/no-default-export
export { TimelineDataTable as default };
