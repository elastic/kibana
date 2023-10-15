/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHideFor } from '@elastic/eui';
import React, { useMemo, useCallback, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { generateFilters } from '@kbn/data-plugin/public';
import type { DataViewField } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DataLoadingState } from '@kbn/unified-data-table';
import { useColumns } from '@kbn/unified-data-table';
import { popularizeField } from '@kbn/unified-data-table/src/utils/popularize_field';
import type { DropType } from '@kbn/dom-drag-drop';
import styled from 'styled-components';
import { DragDrop, DropOverlayWrapper, useDragDropContext } from '@kbn/dom-drag-drop';
import type {
  UnifiedFieldListSidebarContainerApi,
  UnifiedFieldListSidebarContainerProps,
} from '@kbn/unified-field-list';
import { FieldsGroupNames, UnifiedFieldListSidebarContainer } from '@kbn/unified-field-list';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { EventDetailsWidthProvider } from '../../../../common/components/events_viewer/event_details_width_context';
import type { ExpandedDetailTimeline } from '../../../../../common/types';
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
  TimelineTabs,
} from '../../../../../common/types/timeline';
import type { State, inputsModel } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { getColumnHeader } from '../body/column_headers/helpers';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { timelineBodySelector } from '../body/selectors';
import { StyledPageContentWrapper, StyledMainEuiPanel, StyledSplitFlexItem } from './styles';
import { DRAG_DROP_FIELD } from './translations';
import { TimelineResizableLayout } from './resizable_layout';
import TimelineDataTable from './data_table';

const TimelineBodyContainer = styled.div.attrs(({ className = '' }) => ({
  className: `${className}`,
}))`
  width: 100%;
  height: 100%;
`;

const DataGridMemoized = React.memo(TimelineDataTable);

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
    localStorageKeyPrefix: 'securitySolution',
    timeRangeUpdatesType: 'timefilter',
    compressed: true,
    showSidebarToggleButton: true,
    disablePopularFields: false,
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
  isTextBasedQuery?: boolean;
}

export const UnifiedTimelineComponent: React.FC<Props> = ({
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
  isTextBasedQuery,
}) => {
  const dispatch = useDispatch();
  const unifiedFieldListContainerRef = useRef<UnifiedFieldListSidebarContainerApi>(null);

  const {
    services: {
      uiSettings,
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      application: { capabilities },
      data: dataPluginContract,
      uiActions,
      charts,
      docLinks,
    },
  } = useKibana();

  const fieldListSidebarServices: UnifiedFieldListSidebarContainerProps['services'] = useMemo(
    () => ({
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      data: dataPluginContract,
      uiActions,
      charts,
      core: {
        uiSettings,
        docLinks,
      } as CoreStart,
    }),
    [
      fieldFormats,
      dataViews,
      dataViewFieldEditor,
      dataPluginContract,
      uiActions,
      charts,
      uiSettings,
      docLinks,
    ]
  );

  const [sidebarContainer, setSidebarContainer] = useState<HTMLDivElement | null>(null);
  const [mainContainer, setMainContainer] = useState<HTMLDivElement | null>(null);

  const { timeline: { filterManager } = timelineDefaults } = useSelector((state: State) =>
    timelineBodySelector(state, timelineId)
  );

  const defaultColumns = useMemo(() => {
    return columns.map((c) => c.id);
  }, [columns]);
  const { sourcererDataView } = useSourcererDataView(SourcererScopeName.timeline);

  const dataView = useMemo(() => {
    if (sourcererDataView != null) {
      return new DataView({ spec: sourcererDataView, fieldFormats });
    } else {
      return undefined;
    }
  }, [sourcererDataView, fieldFormats]);

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

  const { onAddColumn, onRemoveColumn } = useColumns({
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

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: unknown, operation: '+' | '-') => {
      console.log(field)
      console.log(values)
      if (dataView && filterManager) {
        const fieldName = typeof field === 'string' ? field : field.name;
        popularizeField(dataView, fieldName, dataViews, capabilities);
        const newFilters = generateFilters(filterManager, field, values, operation, dataView);
        return filterManager.addFilters(newFilters);
      }
    },
    [filterManager, dataView, dataViews, capabilities]
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
    <TimelineBodyContainer className="test" ref={setSidebarContainer}>
      <TimelineResizableLayout
        container={sidebarContainer}
        unifiedFieldListSidebarContainerApi={unifiedFieldListContainerRef.current}
        sidebarPanel={
          <EuiFlexGroup gutterSize="none" className="test-gr">
            <EuiFlexItem>
              <UnifiedFieldListSidebarContainer
                ref={unifiedFieldListContainerRef}
                showFieldList={true}
                variant="responsive"
                getCreationOptions={getCreationOptions}
                services={fieldListSidebarServices}
                dataView={dataView}
                fullWidth
                allFields={dataView.fields}
                workspaceSelectedFieldNames={defaultColumns}
                onAddFieldToWorkspace={onAddFieldToWorkspace}
                onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
                onAddFilter={onAddFilter}
                onFieldEdited={async () => Promise.resolve(refetch())}
              />
            </EuiFlexItem>
            <EuiHideFor sizes={['xs', 's']}>
              <StyledSplitFlexItem grow={false} className="thinBorderSplit" />
            </EuiHideFor>
          </EuiFlexGroup>
        }
        mainPanel={
          <StyledPageContentWrapper>
            <StyledMainEuiPanel
              role="main"
              panelRef={setMainContainer}
              paddingSize="none"
              borderRadius="none"
              hasShadow={false}
              hasBorder={false}
              color="transparent"
            >
              <DragDrop
                draggable={false}
                dropTypes={isDropAllowed ? DROP_PROPS.types : undefined}
                value={DROP_PROPS.value}
                order={DROP_PROPS.order}
                onDrop={onDropFieldToTable}
              >
                <DropOverlayWrapper isVisible={isDropAllowed}>
                  <EventDetailsWidthProvider>
                    <DataGridMemoized
                      columns={columns}
                      rowRenderers={rowRenderers}
                      timelineId={timelineId}
                      itemsPerPage={itemsPerPage}
                      itemsPerPageOptions={itemsPerPageOptions}
                      sort={sort}
                      events={events}
                      refetch={refetch}
                      dataLoadingState={dataLoadingState}
                      totalCount={totalCount}
                      onEventClosed={onEventClosed}
                      expandedDetail={expandedDetail}
                      showExpandedDetails={showExpandedDetails}
                      onChangePage={onChangePage}
                      activeTab={activeTab}
                      updatedAt={updatedAt}
                      isTextBasedQuery={isTextBasedQuery}
                    />
                  </EventDetailsWidthProvider>
                </DropOverlayWrapper>
              </DragDrop>
            </StyledMainEuiPanel>
          </StyledPageContentWrapper>
        }
      />
    </TimelineBodyContainer>
  );
};

export const UnifiedTimeline = React.memo(UnifiedTimelineComponent);
// eslint-disable-next-line import/no-default-export
export { UnifiedTimeline as default };
