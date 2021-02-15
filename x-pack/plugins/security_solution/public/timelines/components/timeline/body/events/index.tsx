/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { inputsModel } from '../../../../../common/store';
import { BrowserFields } from '../../../../../common/containers/source';
import {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { TimelineTabs } from '../../../../../../common/types/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnRowSelected } from '../../events';
import { EventsTbody } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { StatefulEvent } from './stateful_event';
import { eventIsPinned } from '../helpers';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
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
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
}

const EventsComponent: React.FC<Props> = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  columnRenderers,
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
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  tabType,
}) => (
  <EventsTbody data-test-subj="events">
    {data.map((event, i) => (
      <StatefulEvent
        actionsColumnWidth={actionsColumnWidth}
        ariaRowindex={i + ARIA_ROW_INDEX_OFFSET}
        browserFields={browserFields}
        columnHeaders={columnHeaders}
        columnRenderers={columnRenderers}
        containerRef={containerRef}
        event={event}
        eventIdToNoteIds={eventIdToNoteIds}
        isEventPinned={eventIsPinned({ eventId: event._id, pinnedEventIds })}
        isEventViewer={isEventViewer}
        key={`${id}_${tabType}_${event._id}_${event._index}`}
        lastFocusedAriaColindex={lastFocusedAriaColindex}
        loadingEventIds={loadingEventIds}
        onRowSelected={onRowSelected}
        refetch={refetch}
        rowRenderers={rowRenderers}
        onRuleChange={onRuleChange}
        selectedEventIds={selectedEventIds}
        showCheckboxes={showCheckboxes}
        tabType={tabType}
        timelineId={id}
      />
    ))}
  </EventsTbody>
);

export const Events = React.memo(EventsComponent);
