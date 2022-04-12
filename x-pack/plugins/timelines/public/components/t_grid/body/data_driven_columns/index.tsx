/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiScreenReaderOnly } from '@elastic/eui';
import React, { useMemo } from 'react';
import { getOr } from 'lodash/fp';

import { DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import { OnRowSelected } from '../../types';

import {
  EventsTd,
  EVENTS_TD_CLASS_NAME,
  EventsTdContent,
  EventsTdGroupData,
  EventsTdGroupActions,
} from '../../styles';

import { StatefulCell } from './stateful_cell';
import * as i18n from './translations';
import {
  SetEventsDeleted,
  SetEventsLoading,
  TimelineTabs,
} from '../../../../../common/types/timeline';
import type {
  ActionProps,
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowCellRender,
} from '../../../../../common/types/timeline';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { ARIA_COLUMN_INDEX_OFFSET } from '../../helpers';
import type { Ecs } from '../../../../../common/ecs';

interface CellProps {
  _id: string;
  ariaRowindex: number;
  index: number;
  header: ColumnHeaderOptions;
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  hasRowRenderers: boolean;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  tabType?: TimelineTabs;
  timelineId: string;
}

interface DataDrivenColumnProps {
  id: string;
  actionsColumnWidth: number;
  ariaRowindex: number;
  checked: boolean;
  columnHeaders: ColumnHeaderOptions[];
  columnValues: string;
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  onRowSelected: OnRowSelected;
  onRuleChange?: () => void;
  hasRowRenderers: boolean;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  tabType?: TimelineTabs;
  timelineId: string;
  trailingControlColumns: ControlColumnProps[];
  leadingControlColumns: ControlColumnProps[];
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
}

const SPACE = ' ';

export const shouldForwardKeyDownEvent = (key: string): boolean => {
  switch (key) {
    case SPACE: // fall through
    case 'Enter':
      return true;
    default:
      return false;
  }
};

export const onKeyDown = (keyboardEvent: React.KeyboardEvent) => {
  const { altKey, ctrlKey, key, metaKey, shiftKey, target, type } = keyboardEvent;

  const targetElement = target as Element;

  // we *only* forward the event to the (child) draggable keyboard wrapper
  // if the keyboard event originated from the container (TD) element
  if (shouldForwardKeyDownEvent(key) && targetElement.className?.includes(EVENTS_TD_CLASS_NAME)) {
    const draggableKeyboardWrapper = targetElement.querySelector<HTMLDivElement>(
      `.${DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}`
    );

    const newEvent = new KeyboardEvent(type, {
      altKey,
      bubbles: true,
      cancelable: true,
      ctrlKey,
      key,
      metaKey,
      shiftKey,
    });

    if (key === ' ') {
      // prevent the default behavior of scrolling the table when space is pressed
      keyboardEvent.preventDefault();
    }

    draggableKeyboardWrapper?.dispatchEvent(newEvent);
  }
};

const TgridActionTdCell = ({
  action: Action,
  width,
  actionsColumnWidth,
  ariaRowindex,
  columnId,
  columnValues,
  data,
  ecsData,
  eventIdToNoteIds,
  index,
  isEventPinned,
  isEventViewer,
  eventId,
  loadingEventIds,
  onEventDetailsPanelOpened,
  onRowSelected,
  rowIndex,
  hasRowRenderers,
  onRuleChange,
  selectedEventIds = {},
  showCheckboxes,
  showNotes = false,
  tabType,
  timelineId,
  toggleShowNotes,
  setEventsLoading,
  setEventsDeleted,
}: ActionProps & {
  columnId: string;
  hasRowRenderers: boolean;
  actionsColumnWidth: number;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
}) => {
  const displayWidth = width ? width : actionsColumnWidth;
  return (
    <EventsTdGroupActions
      width={displayWidth}
      data-test-subj="event-actions-container"
      tabIndex={0}
    >
      <EventsTd
        $ariaColumnIndex={index + ARIA_COLUMN_INDEX_OFFSET}
        key={tabType != null ? `${eventId}_${tabType}` : `${eventId}`}
        onKeyDown={onKeyDown}
        role="button"
        tabIndex={0}
        width={width}
      >
        <EventsTdContent data-test-subj="cell-container">
          <>
            <EuiScreenReaderOnly data-test-subj="screenReaderOnly">
              <p>{i18n.YOU_ARE_IN_A_TABLE_CELL({ row: ariaRowindex, column: index + 2 })}</p>
            </EuiScreenReaderOnly>
            {Action && (
              <Action
                ariaRowindex={ariaRowindex}
                width={width}
                checked={Object.keys(selectedEventIds).includes(eventId)}
                columnId={columnId}
                columnValues={columnValues}
                eventId={eventId}
                data={data}
                ecsData={ecsData}
                eventIdToNoteIds={eventIdToNoteIds}
                index={index}
                isEventPinned={isEventPinned}
                isEventViewer={isEventViewer}
                loadingEventIds={loadingEventIds}
                onEventDetailsPanelOpened={onEventDetailsPanelOpened}
                onRowSelected={onRowSelected}
                rowIndex={rowIndex}
                onRuleChange={onRuleChange}
                showCheckboxes={showCheckboxes}
                showNotes={showNotes}
                timelineId={timelineId}
                toggleShowNotes={toggleShowNotes}
                setEventsLoading={setEventsLoading}
                setEventsDeleted={setEventsDeleted}
              />
            )}
          </>
        </EventsTdContent>
        {hasRowRenderers ? (
          <EuiScreenReaderOnly data-test-subj="hasRowRendererScreenReaderOnly">
            <p>{i18n.EVENT_HAS_AN_EVENT_RENDERER(ariaRowindex)}</p>
          </EuiScreenReaderOnly>
        ) : null}
      </EventsTd>
    </EventsTdGroupActions>
  );
};

const TgridTdCell = ({
  _id,
  ariaRowindex,
  index,
  header,
  data,
  ecsData,
  hasRowRenderers,
  renderCellValue,
  tabType,
  timelineId,
}: CellProps) => {
  const ariaColIndex = index + ARIA_COLUMN_INDEX_OFFSET;
  return (
    <EventsTd
      $ariaColumnIndex={ariaColIndex}
      key={tabType != null ? `${header.id}_${tabType}` : `${header.id}`}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      width={header.initialWidth}
    >
      <EventsTdContent data-test-subj="cell-container">
        <>
          <EuiScreenReaderOnly data-test-subj="screenReaderOnly">
            <p>{i18n.YOU_ARE_IN_A_TABLE_CELL({ row: ariaRowindex, column: ariaColIndex })}</p>
          </EuiScreenReaderOnly>
          <StatefulCell
            rowIndex={ariaRowindex - 1}
            colIndex={ariaColIndex - 1}
            data={data}
            header={header}
            eventId={_id}
            linkValues={getOr([], header.linkField ?? '', ecsData)}
            renderCellValue={renderCellValue}
            tabType={tabType}
            timelineId={timelineId}
          />
        </>
      </EventsTdContent>
      {hasRowRenderers ? (
        <EuiScreenReaderOnly data-test-subj="hasRowRendererScreenReaderOnly">
          <p>{i18n.EVENT_HAS_AN_EVENT_RENDERER(ariaRowindex)}</p>
        </EuiScreenReaderOnly>
      ) : null}
    </EventsTd>
  );
};

export const DataDrivenColumns = React.memo<DataDrivenColumnProps>(
  ({
    ariaRowindex,
    actionsColumnWidth,
    columnHeaders,
    columnValues,
    data,
    ecsData,
    isEventViewer,
    id: _id,
    loadingEventIds,
    onEventDetailsPanelOpened,
    onRowSelected,
    hasRowRenderers,
    onRuleChange,
    renderCellValue,
    selectedEventIds = {},
    showCheckboxes,
    tabType,
    timelineId,
    trailingControlColumns,
    leadingControlColumns,
    setEventsLoading,
    setEventsDeleted,
  }) => {
    const trailingActionCells = useMemo(
      () =>
        trailingControlColumns ? trailingControlColumns.map((column) => column.rowCellRender) : [],
      [trailingControlColumns]
    );
    const leadingAndDataColumnCount = useMemo(
      () => leadingControlColumns.length + columnHeaders.length,
      [leadingControlColumns, columnHeaders]
    );
    const TrailingActions = useMemo(
      () =>
        trailingActionCells.map((Action: RowCellRender | undefined, index) => {
          return (
            Action && (
              <TgridActionTdCell
                action={Action}
                width={trailingControlColumns[index].width}
                actionsColumnWidth={actionsColumnWidth}
                ariaRowindex={ariaRowindex}
                checked={Object.keys(selectedEventIds).includes(_id)}
                columnId={trailingControlColumns[index].id || ''}
                columnValues={columnValues}
                onRowSelected={onRowSelected}
                data-test-subj="actions"
                eventId={_id}
                data={data}
                key={index}
                index={leadingAndDataColumnCount + index}
                rowIndex={ariaRowindex}
                ecsData={ecsData}
                loadingEventIds={loadingEventIds}
                onEventDetailsPanelOpened={onEventDetailsPanelOpened}
                showCheckboxes={showCheckboxes}
                isEventViewer={isEventViewer}
                hasRowRenderers={hasRowRenderers}
                onRuleChange={onRuleChange}
                selectedEventIds={selectedEventIds}
                tabType={tabType}
                timelineId={timelineId}
                setEventsLoading={setEventsLoading}
                setEventsDeleted={setEventsDeleted}
              />
            )
          );
        }),
      [
        trailingControlColumns,
        _id,
        data,
        ecsData,
        onRowSelected,
        isEventViewer,
        actionsColumnWidth,
        ariaRowindex,
        columnValues,
        hasRowRenderers,
        leadingAndDataColumnCount,
        loadingEventIds,
        onEventDetailsPanelOpened,
        onRuleChange,
        selectedEventIds,
        showCheckboxes,
        tabType,
        timelineId,
        trailingActionCells,
        setEventsLoading,
        setEventsDeleted,
      ]
    );
    const ColumnHeaders = useMemo(
      () =>
        columnHeaders.map((header, index) => (
          <TgridTdCell
            _id={_id}
            index={index}
            header={header}
            key={tabType != null ? `${header.id}_${tabType}` : `${header.id}`}
            ariaRowindex={ariaRowindex}
            data={data}
            ecsData={ecsData}
            hasRowRenderers={hasRowRenderers}
            renderCellValue={renderCellValue}
            tabType={tabType}
            timelineId={timelineId}
          />
        )),
      [
        _id,
        ariaRowindex,
        columnHeaders,
        data,
        ecsData,
        hasRowRenderers,
        renderCellValue,
        tabType,
        timelineId,
      ]
    );
    return (
      <EventsTdGroupData data-test-subj="data-driven-columns">
        {ColumnHeaders}
        {TrailingActions}
      </EventsTdGroupData>
    );
  }
);

DataDrivenColumns.displayName = 'DataDrivenColumns';

export const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};
