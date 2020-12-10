/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiDataGridSorting,
  EuiToolTip,
  useDataGridColumnSorting,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Droppable, DraggableChildrenFn } from 'react-beautiful-dnd';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { DragEffects } from '../../../../../common/components/drag_and_drop/draggable_wrapper';
import { DraggableFieldBadge } from '../../../../../common/components/draggables/field_badge';
import { BrowserFields } from '../../../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import {
  DRAG_TYPE_FIELD,
  droppableTimelineColumnsPrefix,
} from '../../../../../common/components/drag_and_drop/helpers';
import { EXIT_FULL_SCREEN } from '../../../../../common/components/exit_full_screen/translations';
import { FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../../../common/constants';
import { useFullScreen } from '../../../../../common/containers/use_full_screen';
import { TimelineId } from '../../../../../../common/types/timeline';
import { OnSelectAll } from '../../events';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';
import { StatefulFieldsBrowser } from '../../../fields_browser';
import { StatefulRowRenderersBrowser } from '../../../row_renderers_browser';
import { FIELD_BROWSER_HEIGHT, FIELD_BROWSER_WIDTH } from '../../../fields_browser/helpers';
import {
  EventsTh,
  EventsThContent,
  EventsThead,
  EventsThGroupActions,
  EventsThGroupData,
  EventsTrHeader,
} from '../../styles';
import { Sort, SortDirection } from '../sort';
import { EventsSelect } from './events_select';
import { ColumnHeader } from './column_header';

import * as i18n from './translations';
import { timelineActions } from '../../../../store/timeline';

const SortingColumnsContainer = styled.div`
  .euiPopover .euiButtonEmpty .euiButtonContent .euiButtonEmpty__text {
    display: none;
  }
`;

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
  timelineId: string;
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
  timelineId,
}: Props) => {
  const dispatch = useDispatch();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const {
    timelineFullScreen,
    setTimelineFullScreen,
    globalFullScreen,
    setGlobalFullScreen,
  } = useFullScreen();

  const toggleFullScreen = useCallback(() => {
    if (timelineId === TimelineId.active) {
      setTimelineFullScreen(!timelineFullScreen);
    } else {
      setGlobalFullScreen(!globalFullScreen);
    }
  }, [
    timelineId,
    setTimelineFullScreen,
    timelineFullScreen,
    setGlobalFullScreen,
    globalFullScreen,
  ]);

  const handleSelectAllChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelectAll({ isSelected: event.currentTarget.checked });
    },
    [onSelectAll]
  );

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
          sort={sort}
        />
      )),
    [columnHeaders, timelineId, draggingIndex, sort]
  );

  const fullScreen = useMemo(
    () => isFullScreen({ globalFullScreen, timelineId, timelineFullScreen }),
    [globalFullScreen, timelineId, timelineFullScreen]
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

  const myColumns = useMemo(
    () =>
      columnHeaders.map(({ aggregatable, label, id, type }) => ({
        id,
        isSortable: aggregatable,
        displayAsText: label,
        schema: type,
      })),
    [columnHeaders]
  );

  const onSortColumns = useCallback(
    (cols: EuiDataGridSorting['columns']) =>
      dispatch(
        timelineActions.updateSort({
          id: timelineId,
          sort: cols.map(({ id, direction }) => ({
            columnId: id,
            sortDirection: direction as SortDirection,
          })),
        })
      ),
    [dispatch, timelineId]
  );
  const sortedColumns = useMemo(
    () => ({
      onSort: onSortColumns,
      columns: sort.map<{ id: string; direction: 'asc' | 'desc' }>(
        ({ columnId, sortDirection }) => ({
          id: columnId,
          direction: sortDirection as 'asc' | 'desc',
        })
      ),
    }),
    [onSortColumns, sort]
  );
  const displayValues = useMemo(
    () => columnHeaders.reduce((acc, ch) => ({ ...acc, [ch.id]: ch.label ?? ch.id }), {}),
    [columnHeaders]
  );
  const ColumnSorting = useDataGridColumnSorting(myColumns, sortedColumns, {}, [], displayValues);

  return (
    <EventsThead data-test-subj="column-headers">
      <EventsTrHeader>
        <EventsThGroupActions
          actionsColumnWidth={actionsColumnWidth}
          data-test-subj="actions-container"
          isEventViewer={isEventViewer}
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
            <StatefulFieldsBrowser
              browserFields={browserFields}
              columnHeaders={columnHeaders}
              data-test-subj="field-browser"
              height={FIELD_BROWSER_HEIGHT}
              timelineId={timelineId}
              width={FIELD_BROWSER_WIDTH}
            />
          </EventsTh>
          <EventsTh>
            <StatefulRowRenderersBrowser
              data-test-subj="row-renderers-browser"
              timelineId={timelineId}
            />
          </EventsTh>

          <EventsTh>
            <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
              <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : i18n.FULL_SCREEN}>
                <EuiButtonIcon
                  aria-label={
                    isFullScreen({ globalFullScreen, timelineId, timelineFullScreen })
                      ? EXIT_FULL_SCREEN
                      : i18n.FULL_SCREEN
                  }
                  className={fullScreen ? FULL_SCREEN_TOGGLED_CLASS_NAME : ''}
                  color={fullScreen ? 'ghost' : 'primary'}
                  data-test-subj="full-screen"
                  iconType="fullScreen"
                  onClick={toggleFullScreen}
                />
              </EuiToolTip>
            </EventsThContent>
          </EventsTh>
          <EventsTh>
            <EventsThContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
              <EuiToolTip content={i18n.SORT_FIELDS}>
                <SortingColumnsContainer>{ColumnSorting}</SortingColumnsContainer>
              </EuiToolTip>
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
          {DroppableContent}
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
    prevProps.onSelectAll === nextProps.onSelectAll &&
    prevProps.showEventsSelect === nextProps.showEventsSelect &&
    prevProps.showSelectAllCheckbox === nextProps.showSelectAllCheckbox &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    prevProps.timelineId === nextProps.timelineId &&
    deepEqual(prevProps.columnHeaders, nextProps.columnHeaders) &&
    deepEqual(prevProps.browserFields, nextProps.browserFields)
);
