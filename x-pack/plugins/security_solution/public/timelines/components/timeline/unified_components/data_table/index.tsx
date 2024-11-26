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
import type {
  EuiDataGridControlColumn,
  EuiDataGridCustomBodyProps,
  EuiDataGridProps,
} from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { JEST_ENVIRONMENT } from '../../../../../../common/constants';
import { useOnExpandableFlyoutClose } from '../../../../../flyout/shared/hooks/use_on_expandable_flyout_close';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { selectTimelineById } from '../../../../store/selectors';
import { RowRendererCount } from '../../../../../../common/api/timeline';
import { EmptyComponent } from '../../../../../common/lib/cell_actions/helpers';
import { withDataView } from '../../../../../common/components/with_data_view';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import { useKibana } from '../../../../../common/lib/kibana';
import type {
  ColumnHeaderOptions,
  OnFetchMoreRecords,
  RowRenderer,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
import type { State, inputsModel } from '../../../../../common/store';
import { SecurityCellActionsTrigger } from '../../../../../app/actions/constants';
import { getFormattedFields } from '../../body/renderers/formatted_field_udt';
import ToolbarAdditionalControls from './toolbar_additional_controls';
import {
  StyledTimelineUnifiedDataTable,
  StyledEuiProgress,
  UnifiedTimelineGlobalStyles,
} from '../styles';
import { timelineActions } from '../../../../store';
import { transformTimelineItemToUnifiedRows } from '../utils';
import { TimelineEventDetailRow } from './timeline_event_detail_row';
import { CustomTimelineDataGridBody } from './custom_timeline_data_grid_body';
import { TIMELINE_EVENT_DETAIL_ROW_ID } from '../../body/constants';
import { DocumentEventTypes } from '../../../../../common/lib/telemetry/types';

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
  onFetchMoreRecords: OnFetchMoreRecords;
  activeTab: TimelineTabs;
  dataLoadingState: DataLoadingState;
  updatedAt: number;
  isTextBasedQuery?: boolean;
  leadingControlColumns: EuiDataGridProps['leadingControlColumns'];
} & Pick<
  UnifiedDataTableProps,
  | 'onSort'
  | 'onSetColumns'
  | 'sort'
  | 'onFilter'
  | 'renderCustomGridBody'
  | 'trailingControlColumns'
  | 'isSortEnabled'
  | 'onChangePage'
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
    onFetchMoreRecords,
    updatedAt,
    isTextBasedQuery = false,
    onSetColumns,
    onSort,
    onFilter,
    leadingControlColumns,
    onChangePage,
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
        telemetry,
        theme,
        data: dataPluginContract,
      },
    } = useKibana();

    const [expandedDoc, setExpandedDoc] = useState<DataTableRecord & TimelineItem>();
    const [fetchedPage, setFechedPage] = useState<number>(0);

    const onCloseExpandableFlyout = useCallback((id: string) => {
      setExpandedDoc((prev) => (!prev ? prev : undefined));
    }, []);

    const { closeFlyout, openFlyout } = useExpandableFlyoutApi();
    useOnExpandableFlyoutClose({ callback: onCloseExpandableFlyout });

    const showTimeCol = useMemo(() => !!dataView && !!dataView.timeFieldName, [dataView]);

    const { rowHeight, sampleSize, excludedRowRendererIds } = useSelector((state: State) =>
      selectTimelineById(state, timelineId)
    );

    const { tableRows, tableStylesOverride } = useMemo(
      () => transformTimelineItemToUnifiedRows({ events, dataView }),
      [events, dataView]
    );

    const handleOnEventDetailPanelOpened = useCallback(
      (eventData: DataTableRecord & TimelineItem) => {
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
        telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
          location: timelineId,
          panel: 'right',
        });
      },
      [openFlyout, timelineId, telemetry]
    );

    const onSetExpandedDoc = useCallback(
      (newDoc?: DataTableRecord) => {
        if (newDoc) {
          const timelineDoc = tableRows.find((r) => r.id === newDoc.id);
          setExpandedDoc(timelineDoc);
          if (timelineDoc) {
            handleOnEventDetailPanelOpened(timelineDoc);
          }
        } else {
          closeFlyout();
          setExpandedDoc(undefined);
        }
      },
      [tableRows, handleOnEventDetailPanelOpened, closeFlyout]
    );

    const onColumnResize = useCallback(
      ({ columnId, width }: { columnId: string; width?: number }) => {
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

    const onResizeDataGrid = useCallback<NonNullable<UnifiedDataTableProps['onResize']>>(
      (colSettings) => {
        onColumnResize({
          columnId: colSettings.columnId,
          ...(colSettings.width ? { width: Math.round(colSettings.width) } : {}),
        });
      },
      [onColumnResize]
    );

    const onChangeItemsPerPage = useCallback<
      NonNullable<UnifiedDataTableProps['onUpdateRowsPerPage']>
    >(
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
      onFetchMoreRecords(fetchedPage + 1);
      setFechedPage(fetchedPage + 1);
    }, [fetchedPage, onFetchMoreRecords]);

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

    const TimelineEventDetailRowRendererComp = useMemo<EuiDataGridControlColumn['rowCellRender']>(
      () =>
        function TimelineEventDetailRowRenderer(props) {
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
      [tableRows, timelineId, enabledRowRenderers]
    );

    /**
     * Ref: https://eui.elastic.co/#/tabular-content/data-grid-advanced#custom-body-renderer
     */
    const trailingControlColumns: EuiDataGridProps['trailingControlColumns'] = useMemo(
      () => [
        {
          id: TIMELINE_EVENT_DETAIL_ROW_ID,
          width: 0,
          // The header cell should be visually hidden, but available to screen readers
          headerCellRender: () => <></>,
          headerCellProps: { className: 'euiScreenReaderOnly' },

          // The footer cell can be hidden to both visual & SR users, as it does not contain meaningful information
          footerCellProps: { style: { display: 'none' } },

          rowCellRender: JEST_ENVIRONMENT
            ? TimelineEventDetailRowRendererComp
            : React.memo(TimelineEventDetailRowRendererComp),
        },
      ],
      [TimelineEventDetailRowRendererComp]
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
        gridWidth,
        headerRow,
        footerRow,
      }: EuiDataGridCustomBodyProps) => (
        <CustomTimelineDataGridBody
          rows={tableRows}
          Cell={Cell}
          visibleColumns={visibleColumns}
          visibleRowData={visibleRowData}
          headerRow={headerRow}
          footerRow={footerRow}
          setCustomGridBodyProps={setCustomGridBodyProps}
          enabledRowRenderers={enabledRowRenderers}
          rowHeight={rowHeight}
          gridWidth={gridWidth}
          refetch={refetch}
        />
      ),
      [tableRows, enabledRowRenderers, rowHeight, refetch]
    );

    const finalRenderCustomBodyCallback = useMemo(() => {
      return enabledRowRenderers.length > 0 ? renderCustomBodyCallback : undefined;
    }, [enabledRowRenderers.length, renderCustomBodyCallback]);

    const finalTrailControlColumns = useMemo(() => {
      return enabledRowRenderers.length > 0 ? trailingControlColumns : undefined;
    }, [enabledRowRenderers.length, trailingControlColumns]);

    /**
     * When user changes the page of Unified Data Table
     *
     * One thing to note is that this `pageIndex` is shared between `Query`, `Pinned` and `EQL` tabs.
     * So, when we change the page index in one tab, the shared property is being changed.
     *
     * We need to define a behaviour to distinguish the table state in each tab.
     *
     */
    const onDataGridPageChange = useCallback(
      (newPageIndex: number) => {
        onChangePage?.(newPageIndex);
      },
      [onChangePage]
    );

    return (
      <StatefulEventContext.Provider value={activeStatefulEventContext}>
        <StyledTimelineUnifiedDataTable>
          {(dataLoadingState === DataLoadingState.loading ||
            dataLoadingState === DataLoadingState.loadingMore) && (
            <StyledEuiProgress data-test-subj="discoverDataGridUpdating" size="xs" color="accent" />
          )}
          <UnifiedTimelineGlobalStyles />
          <DataGridMemoized
            ariaLabelledBy="timelineDocumentsAriaLabel"
            className="udtTimeline"
            columns={columnIds}
            expandedDoc={expandedDoc}
            gridStyleOverride={tableStylesOverride}
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
            renderCustomGridBody={finalRenderCustomBodyCallback}
            trailingControlColumns={finalTrailControlColumns}
            externalControlColumns={leadingControlColumns}
            onChangePage={onDataGridPageChange}
          />
        </StyledTimelineUnifiedDataTable>
      </StatefulEventContext.Provider>
    );
  }
);

export const TimelineDataTable = withDataView<DataTableProps>(TimelineDataTableComponent);

// eslint-disable-next-line import/no-default-export
export { TimelineDataTable as default };
