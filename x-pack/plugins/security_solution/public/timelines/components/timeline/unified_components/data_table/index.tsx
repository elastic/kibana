/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { EuiDataGridCustomBodyProps, EuiDataGridProps } from '@elastic/eui';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { selectTimelineById } from '../../../../store/selectors';
import { RowRendererCount } from '../../../../../../common/api/timeline';
import { EmptyComponent } from '../../../../../common/lib/cell_actions/helpers';
import { withDataView } from '../../../../../common/components/with_data_view';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import type { ExpandedDetailTimeline, ExpandedDetailType } from '../../../../../../common/types';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import { useKibana } from '../../../../../common/lib/kibana';
import type {
  ColumnHeaderOptions,
  OnChangePage,
  RowRenderer,
  ToggleDetailPanel,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
import { TimelineId } from '../../../../../../common/types/timeline';
import type { State, inputsModel } from '../../../../../common/store';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { DetailsPanel } from '../../../side_panel';
import { SecurityCellActionsTrigger } from '../../../../../app/actions/constants';
import { getFormattedFields } from '../../body/renderers/formatted_field_udt';
import ToolbarAdditionalControls from './toolbar_additional_controls';
import { StyledTimelineUnifiedDataTable, StyledEuiProgress } from '../styles';
import { timelineActions } from '../../../../store';
import { transformTimelineItemToUnifiedRows } from '../utils';
import { TimelineEventDetailRow } from './timeline_event_detail_row';
import { CustomTimelineDataGridBody } from './custom_timeline_data_grid_body';
import { TIMELINE_EVENT_DETAIL_ROW_ID } from '../../body/constants';
import { useUnifiedTableExpandableFlyout } from '../hooks/use_unified_timeline_expandable_flyout';

export const SAMPLE_SIZE_SETTING = 500;
const DataGridMemoized = React.memo(UnifiedDataTable);

type CommonDataTableProps = {
  columns: ColumnHeaderOptions[];
  columnIds: string[];
  rowRenderers: RowRenderer[];
  timelineId: string;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
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
  leadingControlColumns: EuiDataGridProps['leadingControlColumns'];
  cellContext?: EuiDataGridProps['cellContext'];
  eventIdToNoteIds?: Record<string, string[]>;
} & Pick<
  UnifiedDataTableProps,
  | 'onSort'
  | 'onSetColumns'
  | 'sort'
  | 'onFilter'
  | 'renderCustomGridBody'
  | 'trailingControlColumns'
  | 'isSortEnabled'
>;

interface DataTableProps extends CommonDataTableProps {
  dataView: DataView;
}

export const TimelineDataTableComponent: React.FC<DataTableProps> = memo(
  function TimelineDataTableMemo({
    columns,
    columnIds,
    dataView,
    activeTab,
    timelineId,
    itemsPerPage,
    itemsPerPageOptions,
    rowRenderers,
    sort,
    events,
    isSortEnabled = true,
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
    onSetColumns,
    onSort,
    onFilter,
    leadingControlColumns,
    cellContext,
    eventIdToNoteIds,
  }) {
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
        storage,
        dataViewFieldEditor,
        notifications: { toasts: toastsService },
        theme,
        data: dataPluginContract,
      },
    } = useKibana();

    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord & TimelineItem>();
    const [fetchedPage, setFechedPage] = useState<number>(0);

    const onCloseExpandableFlyout = useCallback(() => {
      setExpandedDoc((prev) => (!prev ? prev : undefined));
    }, []);

    const { openFlyout, closeFlyout, isTimelineExpandableFlyoutEnabled } =
      useUnifiedTableExpandableFlyout({
        onClose: onCloseExpandableFlyout,
      });

    const { browserFields, runtimeMappings } = useSourcererDataView(SourcererScopeName.timeline);

    const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);

    const { rowHeight, sampleSize, excludedRowRendererIds } = useSelector((state: State) =>
      selectTimelineById(state, timelineId)
    );

    const tableRows = useMemo(
      () => transformTimelineItemToUnifiedRows({ events, dataView }),
      [events, dataView]
    );

    const handleOnEventDetailPanelOpened = useCallback(
      (eventData: DataTableRecord & TimelineItem) => {
        const updatedExpandedDetail: ExpandedDetailType = {
          panelView: 'eventDetail',
          params: {
            eventId: eventData._id,
            indexName: eventData.ecs._index ?? '', // TODO: fix type error
            refetch,
          },
        };

        if (isTimelineExpandableFlyoutEnabled) {
          openFlyout({
            right: {
              id: DocumentDetailsRightPanelKey,
              params: {
                id: eventData._id,
                indexName: eventData.ecs._index ?? '',
                scopeId: timelineId,
              },
            },
          });
        } else {
          dispatch(
            timelineActions.toggleDetailPanel({
              ...updatedExpandedDetail,
              tabType: activeTab,
              id: timelineId,
            })
          );
        }

        activeTimeline.toggleExpandedDetail({ ...updatedExpandedDetail });
      },
      [activeTab, dispatch, refetch, timelineId, isTimelineExpandableFlyoutEnabled, openFlyout]
    );

    const onTimelineLegacyFlyoutClose = useCallback(() => {
      if (
        expandedDetail[activeTab]?.panelView &&
        timelineId === TimelineId.active &&
        showExpandedDetails
      ) {
        activeTimeline.toggleExpandedDetail({});
      }
      setExpandedDoc(undefined);
      onEventClosed({ tabType: activeTab, id: timelineId });
    }, [expandedDetail, activeTab, timelineId, showExpandedDetails, onEventClosed]);

    const onSetExpandedDoc = useCallback(
      (newDoc?: DataTableRecord) => {
        if (newDoc) {
          const timelineDoc = tableRows.find((r) => r.id === newDoc.id);
          setExpandedDoc(timelineDoc);
          if (timelineDoc) {
            handleOnEventDetailPanelOpened(timelineDoc);
          }
        } else {
          if (isTimelineExpandableFlyoutEnabled) {
            closeFlyout();
            return;
          }
          onTimelineLegacyFlyoutClose();
        }
      },
      [
        tableRows,
        handleOnEventDetailPanelOpened,
        onTimelineLegacyFlyoutClose,
        closeFlyout,
        isTimelineExpandableFlyoutEnabled,
      ]
    );

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

    const onChangeItemsPerPage = useCallback(
      (itemsChangedPerPage) => {
        dispatch(
          timelineActions.updateItemsPerPage({ id: timelineId, itemsPerPage: itemsChangedPerPage })
        );
      },
      [dispatch, timelineId]
    );

    const customColumnRenderers = useMemo(
      () =>
        getFormattedFields({
          dataTableRows: tableRows,
          scopeId: 'timeline',
          headers: columns,
        }),
      [columns, tableRows]
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

    const dataGridServices = useMemo(() => {
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

    const enabledRowRenderers = useMemo(() => {
      if (excludedRowRendererIds && excludedRowRendererIds.length === RowRendererCount) return [];

      if (!excludedRowRendererIds) return rowRenderers;

      return rowRenderers.filter((rowRenderer) => !excludedRowRendererIds.includes(rowRenderer.id));
    }, [excludedRowRendererIds, rowRenderers]);

    /**
     * Ref: https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer
     */
    const trailingControlColumns: EuiDataGridProps['trailingControlColumns'] = useMemo(
      () => [
        {
          id: TIMELINE_EVENT_DETAIL_ROW_ID,
          // The header cell should be visually hidden, but available to screen readers
          width: 0,
          headerCellRender: () => <></>,
          headerCellProps: { className: 'euiScreenReaderOnly' },

          // The footer cell can be hidden to both visual & SR users, as it does not contain meaningful information
          footerCellProps: { style: { display: 'none' } },

          // When rendering this custom cell, we'll want to override
          // the automatic width/heights calculated by EuiDataGrid
          rowCellRender: (props) => {
            const { rowIndex, ...restProps } = props;
            return (
              <TimelineEventDetailRow
                event={tableRows[rowIndex]}
                rowIndex={rowIndex}
                timelineId={timelineId}
                enabledRowRenderers={enabledRowRenderers}
                {...restProps}
              />
            );
          },
        },
      ],
      [enabledRowRenderers, tableRows, timelineId]
    );

    /**
     * Ref: https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer
     */
    const renderCustomBodyCallback = useCallback(
      ({
        Cell,
        visibleRowData,
        visibleColumns,
        setCustomGridBodyProps,
      }: EuiDataGridCustomBodyProps) => (
        <CustomTimelineDataGridBody
          rows={tableRows}
          Cell={Cell}
          visibleColumns={visibleColumns}
          visibleRowData={visibleRowData}
          eventIdToNoteIds={eventIdToNoteIds}
          setCustomGridBodyProps={setCustomGridBodyProps}
          events={events}
          enabledRowRenderers={enabledRowRenderers}
          eventIdsAddingNotes={cellContext?.eventIdsAddingNotes}
          onToggleShowNotes={cellContext?.onToggleShowNotes}
          refetch={refetch}
        />
      ),
      [
        tableRows,
        enabledRowRenderers,
        events,
        eventIdToNoteIds,
        cellContext?.eventIdsAddingNotes,
        cellContext?.onToggleShowNotes,
        refetch,
      ]
    );

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
            columns={columnIds}
            expandedDoc={expandedDoc}
            dataView={dataView}
            showColumnTokens={true}
            loadingState={dataLoadingState}
            onFilter={onFilter}
            onResize={onResizeDataGrid}
            onSetColumns={onSetColumns}
            onSort={!isTextBasedQuery ? onSort : undefined}
            rows={tableRows}
            sampleSizeState={sampleSize || 500}
            onUpdateSampleSize={onUpdateSampleSize}
            setExpandedDoc={onSetExpandedDoc}
            showTimeCol={showTimeCol}
            isSortEnabled={isSortEnabled}
            sort={sort}
            rowHeightState={rowHeight}
            isPlainRecord={isTextBasedQuery}
            rowsPerPageState={itemsPerPage}
            onUpdateRowsPerPage={onChangeItemsPerPage}
            onUpdateRowHeight={onUpdateRowHeight}
            onFieldEdited={onFieldEdited}
            cellActionsTriggerId={SecurityCellActionsTrigger.DEFAULT}
            services={dataGridServices}
            visibleCellActions={3}
            externalCustomRenderers={customColumnRenderers}
            renderDocumentView={EmptyComponent}
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
            renderCustomGridBody={renderCustomBodyCallback}
            trailingControlColumns={trailingControlColumns}
            externalControlColumns={leadingControlColumns}
            cellContext={cellContext}
          />
          {showExpandedDetails && !isTimelineExpandableFlyoutEnabled && (
            <DetailsPanel
              browserFields={browserFields}
              handleOnPanelClosed={onTimelineLegacyFlyoutClose}
              runtimeMappings={runtimeMappings}
              tabType={activeTab}
              scopeId={timelineId}
              isFlyoutView
            />
          )}
        </StyledTimelineUnifiedDataTable>
      </StatefulEventContext.Provider>
    );
  }
);

export const TimelineDataTable = withDataView<DataTableProps>(TimelineDataTableComponent);

// eslint-disable-next-line import/no-default-export
export { TimelineDataTable as default };
