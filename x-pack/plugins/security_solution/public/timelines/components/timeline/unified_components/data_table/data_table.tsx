/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type EuiDataGridCellValueElementProps,
  type EuiDataGridControlColumn,
  type EuiDataGridCustomBodyProps,
  type EuiDataGridProps,
} from '@elastic/eui';
import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
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
import { RowRendererId } from '../../../../../../common/api/timeline';
import { getAllFieldsByName } from '../../../../../common/containers/source';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import type {
  ExpandedDetailTimeline,
  ExpandedDetailType,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../../common/types';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import { useKibana } from '../../../../../common/lib/kibana';
import { defaultHeaders } from '../../body/column_headers/default_headers';
import type {
  ColumnHeaderOptions,
  OnChangePage,
  RowRenderer,
  SortColumnTimeline,
  ToggleDetailPanel,
} from '../../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import type { State, inputsModel } from '../../../../../common/store';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { DetailsPanel } from '../../../side_panel';
import { getDefaultControlColumn } from '../../body/control_columns';
import { useLicense } from '../../../../../common/hooks/use_license';
import { SecurityCellActionsTrigger } from '../../../../../actions/constants';
import { Actions } from '../../../../../common/components/header_actions/actions';
import { getColumnHeaderUnified } from '../../body/column_headers/helpers';
import { eventIsPinned } from '../../body/helpers';
import { getFormattedFields } from '../body/renderers/formatted_field_udt';
import { timelineBodySelector } from '../../body/selectors';
import ToolbarAdditionalControls from './toolbar_additional_controls';
import { StyledTimelineUnifiedDataTable, StyledEuiProgress } from './styles';
import CustomGridBodyControls from './render_custom_body';
import RowDetails from './row_details';
import { timelineDefaults } from '../../../../store/defaults';
import { timelineActions } from '../../../../store';
import { NOTES_BUTTON_CLASS_NAME } from '../../properties/helpers';

export const SAMPLE_SIZE_SETTING = 500;
const DataGridMemoized = React.memo(UnifiedDataTable);

interface Props {
  columns: ColumnHeaderOptions[];
  rowRenderers: RowRenderer[];
  timelineId: string;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  sort: SortColumnTimeline[];
  events: TimelineItem[];
  refetch: inputsModel.Refetch;
  onFieldEdited: () => void;
  totalCount: number;
  onEventClosed: (args: ToggleDetailPanel) => void;
  expandedDetail: ExpandedDetailTimeline;
  showExpandedDetails: boolean;
  onChangePage: OnChangePage;
  activeTab: TimelineTabs;
  dataLoadingState: DataLoadingState;
  updatedAt: number;
  isTextBasedQuery?: boolean;
}

/* eslint-disable react/display-name */
export const TimelineDataTableComponent: React.FC<Props> = memo(
  ({
    columns,
    activeTab,
    timelineId,
    itemsPerPage,
    itemsPerPageOptions,
    rowRenderers,
    sort,
    events,
    onFieldEdited,
    refetch,
    dataLoadingState,
    totalCount,
    onEventClosed,
    showExpandedDetails,
    expandedDetail,
    onChangePage,
    updatedAt,
    isTextBasedQuery = false,
  }) => {
    const dispatch = useDispatch();

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
      },
    } = useKibana();

    const isEnterprisePlus = useLicense().isEnterprise();

    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord & TimelineItem>();
    const [fetchedPage, setFechedPage] = useState<number>(0);

    // const [sampleSize, setSampleSize] = useState<number>(SAMPLE_SIZE_SETTING);
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
    const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);
    const defaultColumns = useMemo(() => {
      return columns.map((c) => c.id);
    }, [columns]);
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
    // const [notesMap, setNotesMap] = useState<NotesMap>({});
    const trGroupRef = useRef<HTMLDivElement | null>(null);

    const {
      timeline: {
        eventIdToNoteIds,
        loadingEventIds,
        selectedEventIds,
        filterManager,
        pinnedEventIds,
        excludedRowRendererIds,
        rowHeight,
        sampleSize,
        notesMap,
      } = timelineDefaults,
    } = useSelector((state: State) => timelineBodySelector(state, timelineId));

    const { leadingControlColumns, expandedRowTrailingColumns } = useControlColumns();
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

    // Event details
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

    const handleOnPanelClosed = useCallback(() => {
      if (
        expandedDetail[TimelineTabs.query]?.panelView &&
        timelineId === TimelineId.active &&
        showExpandedDetails
      ) {
        activeTimeline.toggleExpandedDetail({});
      }
      setExpandedDoc(undefined);
      onEventClosed({ tabType: TimelineTabs.query, id: timelineId });
    }, [onEventClosed, timelineId, expandedDetail, showExpandedDetails]);

    const onSetExpandedDoc = useCallback(
      (newDoc?: DataTableRecord) => {
        if (newDoc) {
          const timelineDoc = discoverGridRows.find((r) => r.id === newDoc.id);
          setExpandedDoc(timelineDoc);
          if (timelineDoc) {
            handleOnEventDetailPanelOpened(timelineDoc);
          }
        } else {
          handleOnPanelClosed();
        }
      },
      [discoverGridRows, handleOnEventDetailPanelOpened, handleOnPanelClosed]
    );

    const toggleShowNotesEvent = useCallback(
      (eventId: string) => {
        const row = notesMap[eventId];
        if (row?.isAddingNote !== true) {
          dispatch(
            timelineActions.setNotesMap({
              id: timelineId,
              notesMap: {
                ...notesMap,
                [eventId]: { ...row, isAddingNote: true },
              },
            })
          );
          setTimeout(() => {
            const notesButtonElement = trGroupRef.current?.querySelector<HTMLButtonElement>(
              `.${NOTES_BUTTON_CLASS_NAME}`
            );
            notesButtonElement?.focus();
          }, 0);
        }
      },
      [notesMap, dispatch, timelineId]
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

    // Row renderers
    const enabledRowRenderers = useMemo(() => {
      if (
        excludedRowRendererIds &&
        excludedRowRendererIds.length === Object.keys(RowRendererId).length
      )
        return [];

      if (!excludedRowRendererIds) return rowRenderers;

      return rowRenderers.filter((rowRenderer) => !excludedRowRendererIds.includes(rowRenderer.id));
    }, [excludedRowRendererIds, rowRenderers]);

    const getRowRendererBody = useCallback(
      ({
        Cell,
        visibleRowData,
        visibleColumns,
        setCustomGridBodyProps,
      }: EuiDataGridCustomBodyProps) => (
        <CustomGridBodyControls
          discoverGridRows={discoverGridRows}
          Cell={Cell}
          visibleColumns={visibleColumns}
          visibleRowData={visibleRowData}
          setCustomGridBodyProps={setCustomGridBodyProps}
          enabledRowRenderers={enabledRowRenderers}
          timelineId={timelineId}
        />
      ),
      [discoverGridRows, enabledRowRenderers, timelineId]
    );

    // Columns management
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
            getColumnHeaderUnified(columnId, defaultHeaders)
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
            width, // initialWidth?
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

    const browserFieldsByName = useMemo(() => getAllFieldsByName(browserFields), [browserFields]);

    const customColumnRenderers = useMemo(
      () =>
        getFormattedFields({
          dataTableRows: discoverGridRows,
          scopeId: 'timeline',
          headers: columns,
          browserFieldsByName,
        }),
      [browserFieldsByName, columns, discoverGridRows]
    );

    const handleFetchMoreRecords = useCallback(() => {
      onChangePage(fetchedPage + 1);
      setFechedPage(fetchedPage + 1);
    }, [fetchedPage, onChangePage]);

    const additionalControls = useMemo(
      () => <ToolbarAdditionalControls timelineId={timelineId} updatedAt={updatedAt} />,
      [timelineId, updatedAt]
    );

    const cellActionsMetadata = useMemo(() => ({ scopeId: timelineId }), [timelineId]);

    const onUpdateSampleSize = useCallback(
      (newSampleSize: number) => {
        if (newSampleSize !== sampleSize) {
          dispatch(timelineActions.updateSampleSize({ id: timelineId, sampleSize: newSampleSize }));
          refetch();
        }
      },
      [dispatch, sampleSize, timelineId, refetch]
    );

    const onUpdateRowHeight = useCallback(
      (newRowHeight: number) => {
        if (newRowHeight !== rowHeight) {
          dispatch(timelineActions.updateRowHeight({ id: timelineId, rowHeight: newRowHeight }));
        }
      },
      [dispatch, rowHeight, timelineId]
    );

    const services = useMemo(() => {
      return {
        theme,
        fieldFormats,
        storage,
        toastNotifications: toastsService,
        uiSettings,
        dataViewFieldEditor,
        data: dataPluginContract,
      };
    }, [
      theme,
      fieldFormats,
      storage,
      toastsService,
      uiSettings,
      dataViewFieldEditor,
      dataPluginContract,
    ]);

    if (!dataView) {
      return null;
    }

    return (
      <StatefulEventContext.Provider value={activeStatefulEventContext}>
        <StyledTimelineUnifiedDataTable>
          {(dataLoadingState === DataLoadingState.loading ||
            dataLoadingState === DataLoadingState.loadingMore) && (
            <StyledEuiProgress data-test-subj="discoverDataGridUpdating" size="xs" color="accent" />
          )}
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
            sampleSizeState={sampleSize || 500}
            onUpdateSampleSize={onUpdateSampleSize}
            setExpandedDoc={onSetExpandedDoc}
            settings={tableSettings}
            showTimeCol={showTimeCol}
            isSortEnabled={true}
            sort={sortingColumns}
            rowHeightState={3}
            isPlainRecord={isTextBasedQuery}
            rowsPerPageState={itemsPerPage}
            onUpdateRowsPerPage={onChangeItemsPerPage}
            onUpdateRowHeight={onUpdateRowHeight}
            onFieldEdited={onFieldEdited}
            cellActionsTriggerId={SecurityCellActionsTrigger.DEFAULT}
            services={services}
            visibleCellActions={3}
            externalCustomRenderers={customColumnRenderers}
            renderDocumentView={() => <></>}
            externalControlColumns={leadingControlColumns as unknown as EuiDataGridControlColumn[]}
            externalAdditionalControls={additionalControls}
            trailingControlColumns={expandedRowTrailingColumns}
            renderCustomGridBody={getRowRendererBody}
            rowsPerPageOptions={itemsPerPageOptions}
            showFullScreenButton={false}
            useNewFieldsApi={true}
            maxDocFieldsDisplayed={50}
            consumer="timeline"
            totalHits={totalCount}
            onFetchMoreRecords={handleFetchMoreRecords}
            configRowHeight={3}
            showMultiFields={true}
            cellActionsMetadata={cellActionsMetadata}
          />
          {showExpandedDetails && (
            <DetailsPanel
              browserFields={browserFields}
              handleOnPanelClosed={handleOnPanelClosed}
              runtimeMappings={runtimeMappings}
              tabType={TimelineTabs.query}
              scopeId={timelineId}
              isFlyoutView
            />
          )}
        </StyledTimelineUnifiedDataTable>
      </StatefulEventContext.Provider>
    );
  }
);

export const TimelineDataTable = React.memo(TimelineDataTableComponent);
// eslint-disable-next-line import/no-default-export
export { TimelineDataTable as default };
