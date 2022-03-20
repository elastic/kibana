/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import deepEqual from 'fast-deep-equal';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Droppable, DraggableChildrenFn } from 'react-beautiful-dnd';

import { DragEffects } from '../../../../../common/components/drag_and_drop/draggable_wrapper';
import { DraggableFieldBadge } from '../../../../../common/components/draggables/field_badge';
import { BrowserFields } from '../../../../../common/containers/source';
import {
  DRAG_TYPE_FIELD,
  droppableTimelineColumnsPrefix,
} from '../../../../../common/components/drag_and_drop/helpers';
import {
  ColumnHeaderOptions,
  ControlColumnProps,
  HeaderActionProps,
  TimelineId,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
import { OnSelectAll } from '../../events';
import {
  EventsTh,
  EventsThead,
  EventsThGroupData,
  EventsTrHeader,
  EventsThGroupActions,
} from '../../styles';
import { Sort } from '../sort';
import { ColumnHeader } from './column_header';

import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useFieldBrowserOptions, FieldEditorActions } from '../../../fields_browser';

export interface ColumnHeadersComponentProps {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onSelectAll: OnSelectAll;
  show: boolean;
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
  show,
  showEventsSelect,
  showSelectAllCheckbox,
  sort,
  tabType,
  timelineId,
  leadingControlColumns,
  trailingControlColumns,
}: ColumnHeadersComponentProps) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const fieldEditorActionsRef = useRef<FieldEditorActions>(null);

  useEffect(() => {
    return () => {
      if (fieldEditorActionsRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fieldEditorActionsRef.current.closeEditor();
      }
    };
  }, []);

  useEffect(() => {
    if (!show && fieldEditorActionsRef.current) {
      fieldEditorActionsRef.current.closeEditor();
    }
  }, [show]);

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
            <DragEffects>
              <DraggableFieldBadge fieldId={header.id} fieldWidth={header.initialWidth} />
            </DragEffects>
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

  const DroppableContent = useCallback(
    (dropProvided, snapshot) => (
      <>
        <EventsThGroupData
          data-test-subj="headers-group"
          ref={dropProvided.innerRef}
          isDragging={snapshot.isDraggingOver}
          {...dropProvided.droppableProps}
        >
          {ColumnHeaderList}
        </EventsThGroupData>
      </>
    ),
    [ColumnHeaderList]
  );

  const leadingHeaderCells = useMemo(
    () =>
      leadingControlColumns ? leadingControlColumns.map((column) => column.headerCellRender) : [],
    [leadingControlColumns]
  );

  const trailingHeaderCells = useMemo(
    () =>
      trailingControlColumns ? trailingControlColumns.map((column) => column.headerCellRender) : [],
    [trailingControlColumns]
  );

  const fieldBrowserOptions = useFieldBrowserOptions({
    sourcererScope: SourcererScopeName.timeline,
    timelineId: timelineId as TimelineId,
    editorActionsRef: fieldEditorActionsRef,
  });

  const LeadingHeaderActions = useMemo(() => {
    return leadingHeaderCells.map(
      (Header: React.ComponentType<HeaderActionProps> | React.ComponentType | undefined, index) => {
        const passedWidth = leadingControlColumns[index] && leadingControlColumns[index].width;
        const width = passedWidth ? passedWidth : actionsColumnWidth;
        return (
          <EventsThGroupActions
            actionsColumnWidth={width}
            data-test-subj="actions-container"
            isEventViewer={isEventViewer}
            key={index}
          >
            {Header && (
              <Header
                width={width}
                browserFields={browserFields}
                columnHeaders={columnHeaders}
                isEventViewer={isEventViewer}
                isSelectAllChecked={isSelectAllChecked}
                onSelectAll={onSelectAll}
                showEventsSelect={showEventsSelect}
                showSelectAllCheckbox={showSelectAllCheckbox}
                sort={sort}
                tabType={tabType}
                timelineId={timelineId}
                fieldBrowserOptions={fieldBrowserOptions}
              />
            )}
          </EventsThGroupActions>
        );
      }
    );
  }, [
    leadingHeaderCells,
    leadingControlColumns,
    actionsColumnWidth,
    browserFields,
    columnHeaders,
    fieldBrowserOptions,
    isEventViewer,
    isSelectAllChecked,
    onSelectAll,
    showEventsSelect,
    showSelectAllCheckbox,
    sort,
    tabType,
    timelineId,
  ]);

  const TrailingHeaderActions = useMemo(() => {
    return trailingHeaderCells.map(
      (Header: React.ComponentType<HeaderActionProps> | React.ComponentType | undefined, index) => {
        const passedWidth = trailingControlColumns[index] && trailingControlColumns[index].width;
        const width = passedWidth ? passedWidth : actionsColumnWidth;
        return (
          <EventsThGroupActions
            actionsColumnWidth={width}
            data-test-subj="actions-container"
            isEventViewer={isEventViewer}
            key={index}
          >
            {Header && (
              <Header
                width={width}
                browserFields={browserFields}
                columnHeaders={columnHeaders}
                isEventViewer={isEventViewer}
                isSelectAllChecked={isSelectAllChecked}
                onSelectAll={onSelectAll}
                showEventsSelect={showEventsSelect}
                showSelectAllCheckbox={showSelectAllCheckbox}
                sort={sort}
                tabType={tabType}
                timelineId={timelineId}
                fieldBrowserOptions={fieldBrowserOptions}
              />
            )}
          </EventsThGroupActions>
        );
      }
    );
  }, [
    trailingHeaderCells,
    trailingControlColumns,
    actionsColumnWidth,
    browserFields,
    columnHeaders,
    fieldBrowserOptions,
    isEventViewer,
    isSelectAllChecked,
    onSelectAll,
    showEventsSelect,
    showSelectAllCheckbox,
    sort,
    tabType,
    timelineId,
  ]);
  return (
    <EventsThead data-test-subj="column-headers">
      <EventsTrHeader>
        {LeadingHeaderActions}
        <Droppable
          direction={'horizontal'}
          droppableId={`${droppableTimelineColumnsPrefix}-${tabType}.${timelineId}`}
          isDropDisabled={false}
          type={DRAG_TYPE_FIELD}
          renderClone={renderClone}
        >
          {DroppableContent}
        </Droppable>
        {TrailingHeaderActions}
      </EventsTrHeader>
    </EventsThead>
  );
};

export const ColumnHeaders = React.memo(
  ColumnHeadersComponent,
  (prevProps, nextProps) =>
    prevProps.actionsColumnWidth === nextProps.actionsColumnWidth &&
    prevProps.isEventViewer === nextProps.isEventViewer &&
    prevProps.isSelectAllChecked === nextProps.isSelectAllChecked &&
    prevProps.onSelectAll === nextProps.onSelectAll &&
    prevProps.show === nextProps.show &&
    prevProps.showEventsSelect === nextProps.showEventsSelect &&
    prevProps.showSelectAllCheckbox === nextProps.showSelectAllCheckbox &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    prevProps.timelineId === nextProps.timelineId &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    prevProps.tabType === nextProps.tabType &&
    deepEqual(prevProps.browserFields, nextProps.browserFields)
);
