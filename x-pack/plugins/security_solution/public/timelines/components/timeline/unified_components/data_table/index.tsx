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
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { DocumentDetailsProps } from '../../../../../flyout/document_details/shared/types';
import { ESQLDetailsPanelKey } from '../../../../../flyout/esql_details/constants';
import { EmptyComponent } from '../../../../../common/lib/cell_actions/helpers';
import { useOnExpandableFlyoutClose } from '../../../../../flyout/shared/hooks/use_on_expandable_flyout_close';
import { DocumentDetailsRightPanelKey } from '../../../../../flyout/document_details/shared/constants/panel_keys';
import { selectTimelineById } from '../../../../store/selectors';
import { RowRendererCount } from '../../../../../../common/api/timeline';
import { withDataView } from '../../../../../common/components/with_data_view';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import type { TimelineItem } from '../../../../../../common/search_strategy';
import { useKibana } from '../../../../../common/lib/kibana';
import type {
  ColumnHeaderOptions,
  OnChangePage,
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
import type { TimelineDataTableRecord } from '../utils';
import { areTimelineRecords, isTimelineRecord, transformDataToUnifiedRows } from '../utils';
import { TimelineEventDetailRow } from './timeline_event_detail_row';
import { CustomTimelineDataGridBody } from './custom_timeline_data_grid_body';
import { TIMELINE_EVENT_DETAIL_ROW_ID } from '../../body/constants';
import type { UnifiedTimelineDataGridCellContext } from '../../types';

export const SAMPLE_SIZE_SETTING = 500;
const DataGridMemoized = React.memo(UnifiedDataTable);

type CommonDataTableProps = {
  columns: ColumnHeaderOptions[];
  columnIds: string[];
  rowRenderers: RowRenderer[];
  timelineId: string;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  events: TimelineItem[] | DataTableRecord[];
  refetch: inputsModel.Refetch;
  onFieldEdited: () => void;
  totalCount: number;
  onChangePage: OnChangePage;
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
  | 'columnsMeta'
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
    onChangePage,
    updatedAt,
    isTextBasedQuery = false,
    onSetColumns,
    onSort,
    onFilter,
    leadingControlColumns,
    columnsMeta,
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

    const [expandedDoc, setExpandedDoc] = useState<TimelineDataTableRecord | DataTableRecord>();
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
      () => transformDataToUnifiedRows({ events, dataView }),
      [events, dataView]
    );

    const handleOnEventDetailPanelOpened = useCallback(
      (eventData: TimelineDataTableRecord | DataTableRecord) => {
        const params = { scopeId: timelineId } as Partial<Required<DocumentDetailsProps>['params']>;
        /**
         * We want to be able to show the security flyout if _id and _index metadata are available in the ESQL context
         * Since the data is structured differently, we access the _id and _index fields based on the record type
         */
        if (isTimelineRecord(eventData)) {
          params.id = eventData._id;
          params.indexName = eventData?.ecs?._index;
        } else {
          params.id = eventData?.raw?._id;
          params.indexName = eventData?.raw?._index;
        }

        /**
         * If id and index are available we will open the default security flyout. Otherwise if we are in an ESQL mode (isTextBasedQuery === true)
         * we will open a simple flyout with the table and json tabs for rendering the field value pairs returned
         */
        if (params.id && params.indexName) {
          openFlyout({
            right: {
              id: DocumentDetailsRightPanelKey,
              params,
            },
          });
        } else if (isTextBasedQuery) {
          openFlyout({
            shouldSync: false,
            right: {
              id: ESQLDetailsPanelKey,
              params: {
                scopeId: timelineId,
                data: eventData,
              },
            },
          });
        }

        telemetry.reportDetailsFlyoutOpened({
          location: timelineId,
          panel: 'right',
        });
      },
      [isTextBasedQuery, telemetry, timelineId, openFlyout]
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
        areTimelineRecords(tableRows)
          ? getFormattedFields({
              dataTableRows: tableRows,
              scopeId: 'timeline',
              headers: columns,
            })
          : undefined,
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
            return areTimelineRecords(tableRows) ? (
              <TimelineEventDetailRow
                event={tableRows[rowIndex]}
                rowIndex={rowIndex}
                timelineId={timelineId}
                enabledRowRenderers={enabledRowRenderers}
                {...restProps}
              />
            ) : null;
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
          setCustomGridBodyProps={setCustomGridBodyProps}
          enabledRowRenderers={enabledRowRenderers}
          rowHeight={rowHeight}
          refetch={refetch}
        />
      ),
      [tableRows, enabledRowRenderers, rowHeight, refetch]
    );

    const cellContext: UnifiedTimelineDataGridCellContext = useMemo(() => {
      return {
        expandedEventId: expandedDoc?.id,
      };
    }, [expandedDoc]);

    const finalRenderCustomBodyCallback = useMemo(() => {
      return enabledRowRenderers.length > 0 ? renderCustomBodyCallback : undefined;
    }, [enabledRowRenderers.length, renderCustomBodyCallback]);

    const finalTrailControlColumns = useMemo(() => {
      return enabledRowRenderers.length > 0 ? trailingControlColumns : undefined;
    }, [enabledRowRenderers.length, trailingControlColumns]);

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
            onSort={onSort}
            rows={tableRows}
            sampleSizeState={sampleSize || 500}
            onUpdateSampleSize={isTextBasedQuery ? onUpdateSampleSize : undefined}
            setExpandedDoc={onSetExpandedDoc}
            showTimeCol={showTimeCol}
            isSortEnabled={isSortEnabled}
            sort={sort}
            rowHeightState={rowHeight}
            isPaginationEnabled={!isTextBasedQuery}
            isPlainRecord={isTextBasedQuery}
            rowsPerPageState={itemsPerPage}
            onUpdateRowsPerPage={onChangeItemsPerPage}
            onUpdateRowHeight={onUpdateRowHeight}
            onFieldEdited={onFieldEdited}
            cellActionsTriggerId={isTextBasedQuery ? undefined : SecurityCellActionsTrigger.DEFAULT}
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
            trailingControlColumns={isTextBasedQuery ? undefined : finalTrailControlColumns}
            renderCustomGridBody={isTextBasedQuery ? undefined : finalRenderCustomBodyCallback}
            externalControlColumns={leadingControlColumns}
            cellContext={cellContext}
            columnsMeta={columnsMeta}
          />
        </StyledTimelineUnifiedDataTable>
      </StatefulEventContext.Provider>
    );
  }
);

export const TimelineDataTable = withDataView<DataTableProps>(TimelineDataTableComponent);

// eslint-disable-next-line import/no-default-export
export { TimelineDataTable as default };
