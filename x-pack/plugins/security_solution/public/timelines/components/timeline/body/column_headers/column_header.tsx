/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Resizable, ResizeCallback } from 're-resizable';
import deepEqual from 'fast-deep-equal';
import { useDispatch } from 'react-redux';

import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { getDraggableFieldId } from '../../../../../common/components/drag_and_drop/helpers';
import { OnFilterChange } from '../../events';
import { EventsTh, EventsThContent, EventsHeadingHandle } from '../../styles';
import { Sort } from '../sort';

import { Header } from './header';
import { timelineActions } from '../../../../store/timeline';

const RESIZABLE_ENABLE = { right: true };

interface ColumneHeaderProps {
  draggableIndex: number;
  header: ColumnHeaderOptions;
  isDragging: boolean;
  onFilterChange?: OnFilterChange;
  sort: Sort[];
  timelineId: string;
}

const ColumnHeaderComponent: React.FC<ColumneHeaderProps> = ({
  draggableIndex,
  header,
  timelineId,
  isDragging,
  onFilterChange,
  sort,
}) => {
  const dispatch = useDispatch();
  const resizableSize = useMemo(
    () => ({
      width: header.width,
      height: 'auto',
    }),
    [header.width]
  );
  const resizableStyle: {
    position: 'absolute' | 'relative';
  } = useMemo(
    () => ({
      position: isDragging ? 'absolute' : 'relative',
    }),
    [isDragging]
  );
  const resizableHandleComponent = useMemo(
    () => ({
      right: <EventsHeadingHandle />,
    }),
    []
  );
  const handleResizeStop: ResizeCallback = useCallback(
    (e, direction, ref, delta) => {
      dispatch(
        timelineActions.applyDeltaToColumnWidth({
          columnId: header.id,
          delta: delta.width,
          id: timelineId,
        })
      );
    },
    [dispatch, header.id, timelineId]
  );
  const draggableId = useMemo(
    () =>
      getDraggableFieldId({
        contextId: `timeline-column-headers-${timelineId}`,
        fieldId: header.id,
      }),
    [timelineId, header.id]
  );

  const DraggableContent = useCallback(
    (dragProvided) => (
      <EventsTh
        data-test-subj="draggable-header"
        {...dragProvided.draggableProps}
        {...dragProvided.dragHandleProps}
        ref={dragProvided.innerRef}
      >
        <EventsThContent>
          <Header
            timelineId={timelineId}
            header={header}
            onFilterChange={onFilterChange}
            sort={sort}
          />
        </EventsThContent>
      </EventsTh>
    ),
    [header, onFilterChange, sort, timelineId]
  );

  return (
    <Resizable
      enable={RESIZABLE_ENABLE}
      size={resizableSize}
      style={resizableStyle}
      handleComponent={resizableHandleComponent}
      onResizeStop={handleResizeStop}
    >
      <Draggable
        data-test-subj="draggable"
        // Required for drag events while hovering the sort button to work: https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/api/draggable.md#interactive-child-elements-within-a-draggable-
        disableInteractiveElementBlocking
        draggableId={draggableId}
        index={draggableIndex}
        key={header.id}
      >
        {DraggableContent}
      </Draggable>
    </Resizable>
  );
};

export const ColumnHeader = React.memo(
  ColumnHeaderComponent,
  (prevProps, nextProps) =>
    prevProps.draggableIndex === nextProps.draggableIndex &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.onFilterChange === nextProps.onFilterChange &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    deepEqual(prevProps.header, nextProps.header)
);
