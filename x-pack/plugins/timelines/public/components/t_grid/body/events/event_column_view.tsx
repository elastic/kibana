/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { OnRowSelected } from '../../types';
import { EventsTrData, EventsTdGroupActions } from '../../styles';
import { DataDrivenColumns, getMappedNonEcsValue } from '../data_driven_columns';
import { TimelineTabs } from '../../../../../common/types/timeline';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  RowCellRender,
  SetEventsDeleted,
  SetEventsLoading,
} from '../../../../../common/types/timeline';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import type { Ecs } from '../../../../../common/ecs';

interface Props {
  id: string;
  actionsColumnWidth: number;
  ariaRowindex: number;
  columnHeaders: ColumnHeaderOptions[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onEventDetailsPanelOpened: () => void;
  onRowSelected: OnRowSelected;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  onRuleChange?: () => void;
  hasRowRenderers: boolean;
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
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
    isEventViewer = false,
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
                  isEventViewer={isEventViewer}
                  onRuleChange={onRuleChange}
                  tabType={tabType}
                  timelineId={timelineId}
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
        id,
        isEventViewer,
        leadingActionCells,
        leadingControlColumns,
        loadingEventIds,
        onEventDetailsPanelOpened,
        onRowSelected,
        onRuleChange,
        selectedEventIds,
        showCheckboxes,
        tabType,
        timelineId,
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
          isEventViewer={isEventViewer}
          onRuleChange={onRuleChange}
          selectedEventIds={selectedEventIds}
          setEventsLoading={setEventsLoading}
          setEventsDeleted={setEventsDeleted}
        />
      </EventsTrData>
    );
  }
);

EventColumnView.displayName = 'EventColumnView';
