/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { inputsModel } from '../../../../../common/store';
import { BrowserFields } from '../../../../../common/containers/source';
import {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnRowSelected } from '../../events';
import { EventsTbody } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { StatefulEvent } from './stateful_event';
import { eventIsPinned } from '../helpers';

interface Props {
  actionsColumnWidth: number;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineItem[];
  expanded: { eventId?: string; indexName?: string };
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  id: string;
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onEventToggled: (event: TimelineItem) => void;
  onRowSelected: OnRowSelected;
  pinnedEventIds: Readonly<Record<string, boolean>>;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
}

const EventsComponent: React.FC<Props> = ({
  actionsColumnWidth,
  browserFields,
  columnHeaders,
  columnRenderers,
  data,
  eventIdToNoteIds,
  expanded,
  id,
  isEventViewer = false,
  loadingEventIds,
  onRowSelected,
  pinnedEventIds,
  refetch,
  onEventToggled,
  onRuleChange,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
}) => (
  <EventsTbody data-test-subj="events">
    {data.map((event) => (
      <StatefulEvent
        actionsColumnWidth={actionsColumnWidth}
        browserFields={browserFields}
        columnHeaders={columnHeaders}
        columnRenderers={columnRenderers}
        event={event}
        eventIdToNoteIds={eventIdToNoteIds}
        isEventPinned={eventIsPinned({ eventId: event._id, pinnedEventIds })}
        isEventViewer={isEventViewer}
        isExpanded={expanded.eventId === event._id}
        key={`${event._id}_${event._index}`}
        loadingEventIds={loadingEventIds}
        onRowSelected={onRowSelected}
        refetch={refetch}
        rowRenderers={rowRenderers}
        onEventToggled={() => onEventToggled(event)}
        onRuleChange={onRuleChange}
        selectedEventIds={selectedEventIds}
        showCheckboxes={showCheckboxes}
        timelineId={id}
      />
    ))}
  </EventsTbody>
);

export const Events = React.memo(EventsComponent);
