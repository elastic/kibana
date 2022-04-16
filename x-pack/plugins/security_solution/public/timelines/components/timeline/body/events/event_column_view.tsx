/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { SetEventsLoading, SetEventsDeleted } from '@kbn/timelines-plugin/common';
import { Ecs } from '../../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { OnRowSelected } from '../../events';
import { EventsTrData, EventsTdGroupActions } from '../../styles';
import { DataDrivenColumns, getMappedNonEcsValue } from '../data_driven_columns';
import { inputsModel } from '../../../../../common/store';
import {
  ColumnHeaderOptions,
  CellValueElementProps,
  ControlColumnProps,
  RowCellRender,
  TimelineTabs,
} from '../../../../../../common/types/timeline';

interface Props {
  id: string;
  actionsColumnWidth: number;
  ariaRowindex: number;
  columnHeaders: ColumnHeaderOptions[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventPinned: boolean;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  notesCount: number;
  onEventDetailsPanelOpened: () => void;
  onRowSelected: OnRowSelected;
  refetch: inputsModel.Refetch;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  onRuleChange?: () => void;
  hasRowRenderers: boolean;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  showNotes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
  toggleShowNotes: () => void;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
}

export const EventColumnView = React.memo<Props>(
  ({
    id,
    actionsColumnWidth,
    ariaRowindex,
    columnHeaders,
    data,
    ecsData,
    eventIdToNoteIds,
    isEventPinned = false,
    isEventViewer = false,
    loadingEventIds,
    notesCount,
    onEventDetailsPanelOpened,
    onRowSelected,
    refetch,
    hasRowRenderers,
    onRuleChange,
    renderCellValue,
    selectedEventIds,
    showCheckboxes,
    showNotes,
    tabType,
    timelineId,
    toggleShowNotes,
    leadingControlColumns,
    trailingControlColumns,
    setEventsLoading,
    setEventsDeleted,
  }) => {
    // Each action button shall announce itself to screen readers via an `aria-label`
    // in the following format:
    // "button description, for the event in row {ariaRowindex}, with columns {columnValues}",
    // so we combine the column values here:
    const columnValues = useMemo(
      () =>
        columnHeaders
          .map(
            (header) =>
              getMappedNonEcsValue({
                data,
                fieldName: header.id,
              }) ?? []
          )
          .join(' '),
      [columnHeaders, data]
    );

    const leadingActionCells = useMemo(
      () =>
        leadingControlColumns ? leadingControlColumns.map((column) => column.rowCellRender) : [],
      [leadingControlColumns]
    );
    const LeadingActions = useMemo(
      () =>
        leadingActionCells.map((Action: RowCellRender | undefined, index) => {
          const width = leadingControlColumns[index].width
            ? leadingControlColumns[index].width
            : actionsColumnWidth;
          return (
            <EventsTdGroupActions
              width={width}
              data-test-subj="event-actions-container"
              tabIndex={0}
              key={index}
            >
              {Action && (
                <Action
                  width={width}
                  rowIndex={ariaRowindex}
                  ariaRowindex={ariaRowindex}
                  checked={Object.keys(selectedEventIds).includes(id)}
                  columnId={leadingControlColumns[index].id || ''}
                  columnValues={columnValues}
                  onRowSelected={onRowSelected}
                  data-test-subj="actions"
                  eventId={id}
                  data={data}
                  index={index}
                  ecsData={ecsData}
                  loadingEventIds={loadingEventIds}
                  onEventDetailsPanelOpened={onEventDetailsPanelOpened}
                  showCheckboxes={showCheckboxes}
                  eventIdToNoteIds={eventIdToNoteIds}
                  isEventPinned={isEventPinned}
                  isEventViewer={isEventViewer}
                  onRuleChange={onRuleChange}
                  refetch={refetch}
                  showNotes={showNotes}
                  tabType={tabType}
                  timelineId={timelineId}
                  toggleShowNotes={toggleShowNotes}
                  setEventsLoading={setEventsLoading}
                  setEventsDeleted={setEventsDeleted}
                />
              )}
            </EventsTdGroupActions>
          );
        }),
      [
        actionsColumnWidth,
        ariaRowindex,
        columnValues,
        data,
        ecsData,
        eventIdToNoteIds,
        id,
        isEventPinned,
        isEventViewer,
        leadingActionCells,
        leadingControlColumns,
        loadingEventIds,
        onEventDetailsPanelOpened,
        onRowSelected,
        onRuleChange,
        refetch,
        selectedEventIds,
        showCheckboxes,
        showNotes,
        tabType,
        timelineId,
        toggleShowNotes,
        setEventsLoading,
        setEventsDeleted,
      ]
    );
    return (
      <EventsTrData data-test-subj="event-column-view">
        {LeadingActions}
        <DataDrivenColumns
          id={id}
          actionsColumnWidth={actionsColumnWidth}
          ariaRowindex={ariaRowindex}
          columnHeaders={columnHeaders}
          data={data}
          ecsData={ecsData}
          hasRowRenderers={hasRowRenderers}
          notesCount={notesCount}
          renderCellValue={renderCellValue}
          tabType={tabType}
          timelineId={timelineId}
          trailingControlColumns={trailingControlColumns}
          leadingControlColumns={leadingControlColumns}
          checked={Object.keys(selectedEventIds).includes(id)}
          columnValues={columnValues}
          onRowSelected={onRowSelected}
          data-test-subj="actions"
          loadingEventIds={loadingEventIds}
          onEventDetailsPanelOpened={onEventDetailsPanelOpened}
          showCheckboxes={showCheckboxes}
          eventIdToNoteIds={eventIdToNoteIds}
          isEventPinned={isEventPinned}
          isEventViewer={isEventViewer}
          refetch={refetch}
          onRuleChange={onRuleChange}
          selectedEventIds={selectedEventIds}
          showNotes={showNotes}
          toggleShowNotes={toggleShowNotes}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />
      </EventsTrData>
    );
  }
);

EventColumnView.displayName = 'EventColumnView';
