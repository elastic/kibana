/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type {
  UnifiedDataTableSettingsColumn,
  UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { UnifiedDataTable, DataLoadingState } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/public';
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
} from '../../../../../../common/types/timeline';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import type { State, inputsModel } from '../../../../../common/store';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { DetailsPanel } from '../../../side_panel';
import { SecurityCellActionsTrigger } from '../../../../../actions/constants';
import { getFormattedFields } from '../../body/renderers/formatted_field_udt';
import { timelineBodySelector } from '../../body/selectors';
import ToolbarAdditionalControls from './toolbar_additional_controls';
import { StyledTimelineUnifiedDataTable, StyledEuiProgress } from '../styles';
import { timelineDefaults } from '../../../../store/defaults';
import { timelineActions } from '../../../../store';
import { transformTimelineItemToUnifiedRows } from '../utils';

export const SAMPLE_SIZE_SETTING = 500;
const DataGridMemoized = React.memo(UnifiedDataTable);

type CommonDataTableProps = {
  columns: ColumnHeaderOptions[];
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
} & Pick<UnifiedDataTableProps, 'onSort' | 'onSetColumns' | 'sort' | 'onFilter'>;

interface DataTableProps extends CommonDataTableProps {
  dataView: DataView;
}

export const TimelineDataTableComponent: React.FC<DataTableProps> = memo(
  function TimelineDataTableMemo({
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
    onSetColumns,
    onSort,
    onFilter,
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

    const { timeline: { rowHeight, sampleSize } = timelineDefaults } = useSelector((state: State) =>
      timelineBodySelector(state, timelineId)
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
            onFilter={onFilter}
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
          />
          {showExpandedDetails && (
            <DetailsPanel
              browserFields={browserFields}
              handleOnPanelClosed={handleOnPanelClosed}
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
