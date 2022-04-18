/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';

import { inputsModel } from '../../../../../common/store';
import {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import {
  ColumnHeaderOptions,
  CellValueElementProps,
  ControlColumnProps,
  RowRenderer,
  TimelineTabs,
} from '../../../../../../common/types/timeline';
import { OnRowSelected } from '../../events';
import { EventsTbody } from '../../styles';
import { StatefulEvent } from './stateful_event';
import { eventIsPinned } from '../helpers';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

interface Props {
  actionsColumnWidth: number;
  columnHeaders: ColumnHeaderOptions[];
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  data: TimelineItem[];
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  id: string;
  isEventViewer?: boolean;
  lastFocusedAriaColindex: number;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  refetch: inputsModel.Refetch;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
}

const EventsComponent: React.FC<Props> = ({
  actionsColumnWidth,
  columnHeaders,
  containerRef,
  data,
  eventIdToNoteIds,
  id,
  isEventViewer = false,
  lastFocusedAriaColindex,
  loadingEventIds,
  onRowSelected,
  pinnedEventIds,
  refetch,
  onRuleChange,
  renderCellValue,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  tabType,
  leadingControlColumns,
  trailingControlColumns,
}) => (
  <EventsTbody data-test-subj="events">
    {data.map((event, i) => (
      <StatefulEvent
        actionsColumnWidth={actionsColumnWidth}
        ariaRowindex={i + ARIA_ROW_INDEX_OFFSET}
        columnHeaders={columnHeaders}
        containerRef={containerRef}
        event={event}
        eventIdToNoteIds={eventIdToNoteIds}
        isEventPinned={eventIsPinned({ eventId: event._id, pinnedEventIds })}
        isEventViewer={isEventViewer}
        key={`${id}_${tabType}_${event._id}_${event._index}_${
          !isEmpty(event.ecs.eql?.sequenceNumber) ? event.ecs.eql?.sequenceNumber : ''
        }`}
        lastFocusedAriaColindex={lastFocusedAriaColindex}
        loadingEventIds={loadingEventIds}
        onRowSelected={onRowSelected}
        renderCellValue={renderCellValue}
        refetch={refetch}
        rowRenderers={rowRenderers}
        onRuleChange={onRuleChange}
        selectedEventIds={selectedEventIds}
        showCheckboxes={showCheckboxes}
        tabType={tabType}
        timelineId={id}
        leadingControlColumns={leadingControlColumns}
        trailingControlColumns={trailingControlColumns}
      />
    ))}
  </EventsTbody>
);

export const Events = React.memo(EventsComponent);
