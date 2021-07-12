/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DRAG_TYPE_FIELD, droppableTimelineColumnsPrefix } from '@kbn/securitysolution-t-grid';
import { EuiDataGrid, EuiDataGridControlColumn } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Droppable, DraggableChildrenFn } from 'react-beautiful-dnd';

import { pick } from 'lodash';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
// eslint-disable-next-line no-duplicate-imports
import type {
  ControlColumnProps,
  ColumnHeaderOptions,
  HeaderActionProps,
} from '../../../../../common/types/timeline';

import type { BrowserFields } from '../../../../../common/search_strategy/index_fields';

import type { OnSelectAll } from '../../types';
import {
  EventsTh,
  EventsThead,
  EventsThGroupData,
  EventsTrHeader,
  EventsThGroupActions,
} from '../../styles';
import { Sort } from '../sort';
import { ColumnHeader } from './column_header';
import { DraggableFieldBadge } from '../../../draggables';
import { getFieldBrowser } from '../../contol_columns';
import { StatefulFieldsBrowser } from '../../contol_columns/fields_browser';
import {
  FIELD_BROWSER_HEIGHT,
  FIELD_BROWSER_WIDTH,
} from '../../contol_columns/fields_browser/helpers';

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: OnSelectAll;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: Sort[];
  tabType: TimelineTabs;
  timelineId: string;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
}

interface DraggableContainerProps {
  children: React.ReactNode;
  onMount: () => void;
  onUnmount: () => void;
}

export const DraggableContainer = React.memo<DraggableContainerProps>(
  ({ children, onMount, onUnmount }) => {
    useEffect(() => {
      onMount();

      return () => onUnmount();
    }, [onMount, onUnmount]);

    return <>{children}</>;
  }
);

DraggableContainer.displayName = 'DraggableContainer';

export const isFullScreen = ({
  globalFullScreen,
  timelineId,
  timelineFullScreen,
}: {
  globalFullScreen: boolean;
  timelineId: string;
  timelineFullScreen: boolean;
}) =>
  (timelineId === TimelineId.active && timelineFullScreen) ||
  (timelineId !== TimelineId.active && globalFullScreen);

/** Renders the timeline header columns */
export const ColumnHeadersComponent = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  isEventViewer = false,
  isSelectAllChecked,
  onSelectAll,
  showEventsSelect,
  showSelectAllCheckbox,
  sort,
  tabType,
  timelineId,
  leadingControlColumns,
  trailingControlColumns,
}: Props) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const renderClone: DraggableChildrenFn = useCallback(
    (dragProvided, _dragSnapshot, rubric) => {
      const index = rubric.source.index;
      const header = columnHeaders[index];

      const onMount = () => setDraggingIndex(index);
      const onUnmount = () => setDraggingIndex(null);

      return (
        <EventsTh
          data-test-subj="draggable-header"
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          ref={dragProvided.innerRef}
        >
          <DraggableContainer onMount={onMount} onUnmount={onUnmount}>
            <DraggableFieldBadge fieldId={header.id} fieldWidth={header.initialWidth} />
          </DraggableContainer>
        </EventsTh>
      );
    },
    [columnHeaders, setDraggingIndex]
  );

  const ColumnHeaderList = useMemo(
    () =>
      columnHeaders.map((header, draggableIndex) => (
        <ColumnHeader
          key={header.id}
          draggableIndex={draggableIndex}
          timelineId={timelineId}
          header={header}
          isDragging={draggingIndex === draggableIndex}
          sort={sort}
          tabType={tabType}
        />
      )),
    [columnHeaders, timelineId, draggingIndex, sort, tabType]
  );

  const leadingControlCells = useMemo(() => [], []) as EuiDataGridControlColumn[];

  const trailingHeaderCells = useMemo(() => [], []) as EuiDataGridControlColumn[];

  // const LeadingHeaderActions = useMemo(() => {
  //   return leadingHeaderCells.map(
  //     (Header: React.ComponentType<HeaderActionProps> | React.ComponentType | undefined, index) => {
  //       const passedWidth = leadingControlColumns[index] && leadingControlColumns[index].width;
  //       const width = passedWidth ? passedWidth : actionsColumnWidth;
  //       return (
  //         <EventsThGroupActions
  //           actionsColumnWidth={width}
  //           data-test-subj="actions-container"
  //           isEventViewer={isEventViewer}
  //           key={index}
  //         >
  //           {Header && (
  //             <Header
  //               width={width}
  //               browserFields={browserFields}
  //               columnHeaders={columnHeaders}
  //               isEventViewer={isEventViewer}
  //               isSelectAllChecked={isSelectAllChecked}
  //               onSelectAll={onSelectAll}
  //               showEventsSelect={showEventsSelect}
  //               showSelectAllCheckbox={showSelectAllCheckbox}
  //               sort={sort}
  //               tabType={tabType}
  //               timelineId={timelineId}
  //             />
  //           )}
  //         </EventsThGroupActions>
  //       );
  //     }
  //   );
  // }, [
  //   leadingHeaderCells,
  //   leadingControlColumns,
  //   actionsColumnWidth,
  //   browserFields,
  //   columnHeaders,
  //   isEventViewer,
  //   isSelectAllChecked,
  //   onSelectAll,
  //   showEventsSelect,
  //   showSelectAllCheckbox,
  //   sort,
  //   tabType,
  //   timelineId,
  // ]);

  // const TrailingHeaderActions = useMemo(() => {
  //   return trailingHeaderCells.map(
  //     (Header: React.ComponentType<HeaderActionProps> | React.ComponentType | undefined, index) => {
  //       const passedWidth = trailingControlColumns[index] && trailingControlColumns[index].width;
  //       const width = passedWidth ? passedWidth : actionsColumnWidth;
  //       return (
  //         <EventsThGroupActions
  //           actionsColumnWidth={width}
  //           data-test-subj="actions-container"
  //           isEventViewer={isEventViewer}
  //           key={index}
  //         >
  //           {Header && (
  //             <Header
  //               width={width}
  //               browserFields={browserFields}
  //               columnHeaders={columnHeaders}
  //               isEventViewer={isEventViewer}
  //               isSelectAllChecked={isSelectAllChecked}
  //               onSelectAll={onSelectAll}
  //               showEventsSelect={showEventsSelect}
  //               showSelectAllCheckbox={showSelectAllCheckbox}
  //               sort={sort}
  //               tabType={tabType}
  //               timelineId={timelineId}
  //             />
  //           )}
  //         </EventsThGroupActions>
  //       );
  //     }
  //   );
  // }, [
  //   trailingHeaderCells,
  //   trailingControlColumns,
  //   actionsColumnWidth,
  //   browserFields,
  //   columnHeaders,
  //   isEventViewer,
  //   isSelectAllChecked,
  //   onSelectAll,
  //   showEventsSelect,
  //   showSelectAllCheckbox,
  //   sort,
  //   tabType,
  //   timelineId,
  // ]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  useEffect(() => setVisibleColumns(columnHeaders.map(({ id }) => id)), [columnHeaders]);

  const columns = useMemo(
    () =>
      columnHeaders.map((column) => ({
        ...column,
        actions: { showHide: false },
      })),
    [columnHeaders]
  );

  return (
    <EuiDataGrid
      aria-label="data-grid"
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
      }}
      rowCount={0}
      renderCellValue={({ rowIndex, columnId }) => `${rowIndex}, ${columnId}`}
      columns={columns}
      toolbarVisibility={{
        showStyleSelector: true,
        showSortSelector: true,
        showFullScreenSelector: true,
        showColumnSelector: {
          allowHide: false,
          allowReorder: true,
        },
        additionalControls: (
          <StatefulFieldsBrowser
            height={FIELD_BROWSER_HEIGHT}
            width={FIELD_BROWSER_WIDTH}
            browserFields={browserFields}
            timelineId={timelineId}
            columnHeaders={columnHeaders}
          />
        ),
      }}
      // leadingControlColumns={leadingControlCells}
    />
  );

  // return (
  //   <EventsThead data-test-subj="column-headers">
  //     <EventsTrHeader>
  //       {LeadingHeaderActions}
  //       <Droppable
  //         direction={'horizontal'}
  //         droppableId={`${droppableTimelineColumnsPrefix}-${tabType}.${timelineId}`}
  //         isDropDisabled={false}
  //         type={DRAG_TYPE_FIELD}
  //         renderClone={renderClone}
  //       >
  //         {DroppableContent}
  //       </Droppable>
  //       {TrailingHeaderActions}
  //     </EventsTrHeader>
  //   </EventsThead>
  // );
};

export const ColumnHeadersDummy = React.memo(
  ColumnHeadersComponent,
  (prevProps, nextProps) =>
    prevProps.actionsColumnWidth === nextProps.actionsColumnWidth &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
    prevProps.onSelectAll === nextProps.onSelectAll &&
    prevProps.showEventsSelect === nextProps.showEventsSelect &&
    prevProps.showSelectAllCheckbox === nextProps.showSelectAllCheckbox &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    prevProps.timelineId === nextProps.timelineId &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    prevProps.tabType === nextProps.tabType &&
    deepEqual(prevProps.browserFields, nextProps.browserFields)
);
