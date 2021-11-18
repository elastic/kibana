/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiContextMenuPanelDescriptor, EuiIcon, EuiPopover } from '@elastic/eui';
import {
  DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME,
  getDraggableFieldId,
} from '@kbn/securitysolution-t-grid';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Resizable, ResizeCallback } from 're-resizable';
import deepEqual from 'fast-deep-equal';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { DEFAULT_COLUMN_MIN_WIDTH } from '../constants';

import { ARIA_COLUMN_INDEX_OFFSET } from '../../helpers';
import { EventsTh, EventsThContent, EventsHeadingHandle } from '../../styles';
import { Sort } from '../sort';

import { Header } from './header';

import * as i18n from './translations';
import { tGridActions } from '../../../../store/t_grid';
import { TimelineTabs } from '../../../../../common/types/timeline';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline';

import { Direction } from '../../../../../common/search_strategy';
import { useDraggableKeyboardWrapper } from '../../../drag_and_drop';

const ContextMenu = styled(EuiContextMenu)`
  width: 115px;

  & .euiContextMenuItem {
    font-size: 12px;
    padding: 4px 8px;
    width: 115px;
  }
`;

const PopoverContainer = styled.div<{ $width: number }>`
  & .euiPopover__anchor {
    padding-right: 8px;
    width: ${({ $width }) => $width}px;
  }
`;

const RESIZABLE_ENABLE = { right: true };

interface ColumneHeaderProps {
  draggableIndex: number;
  header: ColumnHeaderOptions;
  isDragging: boolean;
  sort: Sort[];
  tabType: TimelineTabs;
  timelineId: string;
}

const ColumnHeaderComponent: React.FC<ColumneHeaderProps> = ({
  draggableIndex,
  header,
  timelineId,
  isDragging,
  sort,
  tabType,
}) => {
  const keyboardHandlerRef = useRef<HTMLDivElement | null>(null);
  const [hoverActionsOwnFocus, setHoverActionsOwnFocus] = useState<boolean>(false);
  const restoreFocus = useCallback(() => keyboardHandlerRef.current?.focus(), []);

  const dispatch = useDispatch();
  const resizableSize = useMemo(
    () => ({
      width: header.initialWidth ?? DEFAULT_COLUMN_MIN_WIDTH,
      height: 'auto',
    }),
    [header.initialWidth]
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
        tGridActions.applyDeltaToColumnWidth({
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
        contextId: `timeline-column-headers-${tabType}-${timelineId}`,
        fieldId: header.id,
      }),
    [tabType, timelineId, header.id]
  );

  const onColumnSort = useCallback(
    (sortDirection: Direction) => {
      const columnId = header.id;
      const headerIndex = sort.findIndex((col) => col.columnId === columnId);
      const newSort =
        headerIndex === -1
          ? [
              ...sort,
              {
                columnId,
                columnType: `${header.type}`,
                sortDirection,
              },
            ]
          : [
              ...sort.slice(0, headerIndex),
              {
                columnId,
                columnType: `${header.type}`,
                sortDirection,
              },
              ...sort.slice(headerIndex + 1),
            ];

      dispatch(
        tGridActions.updateSort({
          id: timelineId,
          sort: newSort,
        })
      );
    },
    [dispatch, header, sort, timelineId]
  );

  const handleClosePopOverTrigger = useCallback(() => {
    setHoverActionsOwnFocus(false);
    restoreFocus();
  }, [restoreFocus]);

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            icon: <EuiIcon type="cross" size="s" />,
            name: i18n.REMOVE_COLUMN,
            onClick: () => {
              dispatch(tGridActions.removeColumn({ id: timelineId, columnId: header.id }));
              handleClosePopOverTrigger();
            },
          },
          ...(tabType !== TimelineTabs.eql
            ? [
                {
                  disabled: !header.aggregatable,
                  icon: <EuiIcon type="sortUp" size="s" />,
                  name: i18n.SORT_AZ,
                  onClick: () => {
                    onColumnSort(Direction.asc);
                    handleClosePopOverTrigger();
                  },
                },
                {
                  disabled: !header.aggregatable,
                  icon: <EuiIcon type="sortDown" size="s" />,
                  name: i18n.SORT_ZA,
                  onClick: () => {
                    onColumnSort(Direction.desc);
                    handleClosePopOverTrigger();
                  },
                },
              ]
            : []),
        ],
      },
    ],
    [
      dispatch,
      handleClosePopOverTrigger,
      header.aggregatable,
      header.id,
      onColumnSort,
      tabType,
      timelineId,
    ]
  );

  const headerButton = useMemo(
    () => <Header timelineId={timelineId} header={header} sort={sort} />,
    [header, sort, timelineId]
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
          <PopoverContainer $width={header.initialWidth ?? DEFAULT_COLUMN_MIN_WIDTH}>
            <EuiPopover
              anchorPosition="downLeft"
              button={headerButton}
              closePopover={handleClosePopOverTrigger}
              isOpen={hoverActionsOwnFocus}
              ownFocus
              panelPaddingSize="none"
            >
              <ContextMenu initialPanelId={0} panels={panels} />
            </EuiPopover>
          </PopoverContainer>
        </EventsThContent>
      </EventsTh>
    ),
    [handleClosePopOverTrigger, headerButton, header.initialWidth, hoverActionsOwnFocus, panels]
  );

  const onFocus = useCallback(() => {
    keyboardHandlerRef.current?.focus();
  }, []);

  const openPopover = useCallback(() => {
    setHoverActionsOwnFocus(true);
  }, []);

  const { onBlur, onKeyDown } = useDraggableKeyboardWrapper({
    closePopover: handleClosePopOverTrigger,
    draggableId,
    fieldName: header.id,
    keyboardHandlerRef,
    openPopover,
  });

  const keyDownHandler = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (!hoverActionsOwnFocus) {
        onKeyDown(keyboardEvent);
      }
    },
    [hoverActionsOwnFocus, onKeyDown]
  );

  return (
    <Resizable
      enable={RESIZABLE_ENABLE}
      size={resizableSize}
      style={resizableStyle}
      handleComponent={resizableHandleComponent}
      onResizeStop={handleResizeStop}
    >
      <div
        aria-colindex={
          draggableIndex != null ? draggableIndex + ARIA_COLUMN_INDEX_OFFSET : undefined
        }
        className={DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}
        data-test-subj="draggableWrapperKeyboardHandler"
        onClick={onFocus}
        onBlur={onBlur}
        onKeyDown={keyDownHandler}
        ref={keyboardHandlerRef}
        role="columnheader"
        tabIndex={0}
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
      </div>
    </Resizable>
  );
};

export const ColumnHeader = React.memo(
  ColumnHeaderComponent,
  (prevProps, nextProps) =>
    prevProps.draggableIndex === nextProps.draggableIndex &&
    prevProps.tabType === nextProps.tabType &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.isDragging === nextProps.isDragging &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    deepEqual(prevProps.header, nextProps.header)
);
