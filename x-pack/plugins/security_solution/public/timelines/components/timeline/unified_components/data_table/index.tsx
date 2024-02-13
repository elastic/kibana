/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { generateFilters } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-plugin/common';
import { flattenHit } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UnifiedDataTableSettingsColumn } from '@kbn/unified-data-table';
import { UnifiedDataTable, useColumns, DataLoadingState } from '@kbn/unified-data-table';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import { popularizeField } from '@kbn/unified-data-table/src/utils/popularize_field';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getAllFieldsByName } from '../../../../../common/containers/source';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import type { ExpandedDetailTimeline, ExpandedDetailType } from '../../../../../../common/types';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import { useKibana } from '../../../../../common/lib/kibana';
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
import { SecurityCellActionsTrigger } from '../../../../../actions/constants';
import { getUnifiedDataTableColumnHeader } from '../../body/column_headers/helpers';
import { getFormattedFields } from '../../body/renderers/get_formatted_fields';
import { timelineBodySelector } from '../../body/selectors';
import ToolbarAdditionalControls from './toolbar_additional_controls';
import { StyledTimelineUnifiedDataTable, StyledEuiProgress } from '../styles';
import { timelineDefaults } from '../../../../store/defaults';
import { timelineActions } from '../../../../store';
import { useGetScopedSourcererDataView } from '../../../../../common/components/sourcerer/get_sourcerer_data_view';
import { defaultUdtHeaders } from '../default_headers';

export const SAMPLE_SIZE_SETTING = 500;
const DataGridMemoized = React.memo(UnifiedDataTable);

interface CommonDataTableProps {
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

interface DataTableProps extends CommonDataTableProps {
  dataView: DataView;
}

/* eslint-disable react/display-name */
export const TimelineDataTableComponent: React.FC<DataTableProps> = memo(
  ({
    columns,
    dataView,
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

    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord & TimelineItem>();
    const [fetchedPage, setFechedPage] = useState<number>(0);

    // const [sampleSize, setSampleSize] = useState<number>(SAMPLE_SIZE_SETTING);
    const { browserFields, runtimeMappings } = useSourcererDataView(SourcererScopeName.timeline);

    const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);

    const tableSettings = useMemo(() => {
      const columnSettings = columns.reduce((acc, item) => {
        if (item.initialWidth) {
          acc[item.id] = { width: item.initialWidth };
        }
        return acc;
      }, {} as Record<string, UnifiedDataTableSettingsColumn>);

      return {
        columns: columnSettings,
      };
    }, [columns]);

    const defaultColumnIds = useMemo(() => columns.map((c) => c.id), [columns]);

    // const [notesMap, setNotesMap] = useState<NotesMap>({});
    const trGroupRef = useRef<HTMLDivElement | null>(null);

    const {
      timeline: { filterManager, excludedRowRendererIds, rowHeight, sampleSize } = timelineDefaults,
    } = useSelector((state: State) => timelineBodySelector(state, timelineId));

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

    const tableRows: Array<DataTableRecord & TimelineItem> = useMemo(
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
          const timelineDoc = tableRows.find((r) => r.id === newDoc.id);
          setExpandedDoc(timelineDoc);
          if (timelineDoc) {
            handleOnEventDetailPanelOpened(timelineDoc);
          }
        } else {
          handleOnPanelClosed();
        }
      },
      [tableRows, handleOnEventDetailPanelOpened, handleOnPanelClosed]
    );

    // ////////////// START SORTING ////////////////

    const sortingColumns: SortOrder[] = useMemo(() => {
      return sort ? sort.map((sortingCol) => [sortingCol.columnId, sortingCol.sortDirection]) : [];
    }, [sort]);

    const onSort = useCallback(
      (nextSort: string[][]) => {
        dispatch(
          timelineActions.updateSort({
            id: timelineId,
            sort: nextSort.map(([id, direction]) => {
              const currentColumn = columns.find((column) => column.id === id);
              const columnType = currentColumn ? currentColumn.type : 'keyword';
              return {
                columnId: id,
                columnType,
                sortDirection: direction,
              } as SortColumnTimeline;
            }),
          })
        );
      },
      [dispatch, timelineId, columns]
    );

    // Columns management
    const { onSetColumns } = useColumns({
      capabilities,
      dataView,
      dataViews,
      setAppState: (newState: { columns: string[]; sort?: string[][] }) => {
        if (newState.sort) {
          onSort(newState.sort);
        } else {
          const columnsStates = newState.columns.map((columnId) =>
            getUnifiedDataTableColumnHeader(columnId, defaultUdtHeaders)
          );
          dispatch(timelineActions.updateColumns({ id: timelineId, columns: columnsStates }));
        }
      },
      useNewFieldsApi: true,
      columns: defaultColumnIds,
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
          unifiedDataTableRows: tableRows,
          scopeId: 'timeline',
          headers: columns,
          browserFieldsByName,
        }),
      [browserFieldsByName, columns, tableRows]
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
            columns={defaultColumnIds}
            expandedDoc={expandedDoc}
            dataView={dataView}
            showColumnTokens={true}
            loadingState={dataLoadingState}
            onFilter={onAddFilter as DocViewFilterFn}
            onResize={onResizeDataGrid}
            onSetColumns={onSetColumns}
            onSort={!isTextBasedQuery ? onSort : undefined}
            rows={tableRows}
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
            externalAdditionalControls={additionalControls}
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

export const TimelineDataTable: React.FC<CommonDataTableProps> = memo((props) => {
  const dataView = useGetScopedSourcererDataView({ sourcererScope: SourcererScopeName.timeline });
  return dataView ? (
    <TimelineDataTableComponent dataView={dataView} {...props} />
  ) : (
    <div>{'TO DO: SHOW ERROR COMPONENT'}</div>
  );
});

// eslint-disable-next-line import/no-default-export
export { TimelineDataTable as default };
