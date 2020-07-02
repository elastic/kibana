/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Droppable, DraggableChildrenFn } from 'react-beautiful-dnd';
import deepEqual from 'fast-deep-equal';

import { DragEffects } from '../../../../../common/components/drag_and_drop/draggable_wrapper';
import { DraggableFieldBadge } from '../../../../../common/components/draggables/field_badge';
import { BrowserFields } from '../../../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import {
  DRAG_TYPE_FIELD,
  droppableTimelineColumnsPrefix,
} from '../../../../../common/components/drag_and_drop/helpers';
import { StatefulFieldsBrowser } from '../../../fields_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import {
  OnColumnRemoved,
  OnColumnResized,
  OnColumnSorted,
  OnFilterChange,
  OnSelectAll,
  OnUpdateColumns,
} from '../../events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';
import {
  EventsTh,
  EventsThContent,
  EventsThead,
  EventsThGroupActions,
  EventsThGroupData,
  EventsTrHeader,
} from '../../styles';
import { Sort } from '../sort';
import { EventsSelect } from './events_select';
import { ColumnHeader } from './column_header';

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  isEventViewer?: boolean;
  isSelectAllChecked: boolean;
  onColumnRemoved: OnColumnRemoved;
  onColumnResized: OnColumnResized;
  onColumnSorted: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  onSelectAll: OnSelectAll;
  onUpdateColumns: OnUpdateColumns;
  showEventsSelect: boolean;
  showSelectAllCheckbox: boolean;
  sort: Sort;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
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

/** Renders the timeline header columns */
export const ColumnHeadersComponent = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  isEventViewer = false,
  isSelectAllChecked,
  onColumnRemoved,
  onColumnResized,
  onColumnSorted,
  onSelectAll,
  onUpdateColumns,
  onFilterChange = noop,
  showEventsSelect,
  showSelectAllCheckbox,
  sort,
  timelineId,
  toggleColumn,
}: Props) => {
  const [draggingIndex, setDraggingIndex] = useState(null);

  const handleSelectAllChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelectAll({ isSelected: event.currentTarget.checked });
    },
    [onSelectAll]
  );

  const renderClone: DraggableChildrenFn = useCallback(
    (dragProvided, _dragSnapshot, rubric) => {
      // TODO: Remove after github.com/DefinitelyTyped/DefinitelyTyped/pull/43057 is merged
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const index = (rubric as any).source.index;
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
              <DraggableFieldBadge fieldId={header.id} fieldWidth={header.width} />
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
          onColumnRemoved={onColumnRemoved}
          onColumnSorted={onColumnSorted}
          onFilterChange={onFilterChange}
          onColumnResized={onColumnResized}
          sort={sort}
        />
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      columnHeaders,
      timelineId,
      draggingIndex,
      onColumnRemoved,
      onFilterChange,
      onColumnResized,
      sort,
    ]
  );

  return (
    <EventsThead data-test-subj="column-headers">
      <EventsTrHeader>
        <EventsThGroupActions
          actionsColumnWidth={actionsColumnWidth}
          data-test-subj="actions-container"
        >
          {showSelectAllCheckbox && (
            <EventsTh>
              <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
                <EuiCheckbox
                  data-test-subj="select-all-events"
                  id={'select-all-events'}
                  checked={isSelectAllChecked}
                  onChange={handleSelectAllChange}
                />
              </EventsThContent>
            </EventsTh>
          )}

          <EventsTh>
            <EventsThContent
              textAlign={showSelectAllCheckbox ? 'left' : 'center'}
              width={DEFAULT_ICON_BUTTON_WIDTH}
            >
              <StatefulFieldsBrowser
                browserFields={browserFields}
                columnHeaders={columnHeaders}
                data-test-subj="field-browser"
                height={FIELD_BROWSER_HEIGHT}
                isEventViewer={isEventViewer}
                onUpdateColumns={onUpdateColumns}
                timelineId={timelineId}
                toggleColumn={toggleColumn}
                width={FIELD_BROWSER_WIDTH}
              />
            </EventsThContent>
          </EventsTh>

          {showEventsSelect && (
            <EventsTh>
              <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
                <EventsSelect checkState="unchecked" timelineId={timelineId} />
              </EventsThContent>
            </EventsTh>
          )}
        </EventsThGroupActions>

        <Droppable
          direction={'horizontal'}
          droppableId={`${droppableTimelineColumnsPrefix}${timelineId}`}
          isDropDisabled={false}
          type={DRAG_TYPE_FIELD}
          renderClone={renderClone}
        >
          {(dropProvided, snapshot) => (
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
          )}
        </Droppable>
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
    prevProps.onColumnRemoved === nextProps.onColumnRemoved &&
    prevProps.onColumnResized === nextProps.onColumnResized &&
    prevProps.onColumnSorted === nextProps.onColumnSorted &&
    prevProps.onSelectAll === nextProps.onSelectAll &&
    prevProps.onUpdateColumns === nextProps.onUpdateColumns &&
    prevProps.onFilterChange === nextProps.onFilterChange &&
    prevProps.showEventsSelect === nextProps.showEventsSelect &&
    prevProps.showSelectAllCheckbox === nextProps.showSelectAllCheckbox &&
    prevProps.sort === nextProps.sort &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.toggleColumn === nextProps.toggleColumn &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    deepEqual(prevProps.browserFields, nextProps.browserFields)
);
