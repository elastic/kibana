/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState, useCallback } from 'react';
import uuid from 'uuid';
import VisibilitySensor from 'react-visibility-sensor';

import { BrowserFields, DocValueFields } from '../../../../../common/containers/source';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { useTimelineEventsDetails } from '../../../../containers/details';
import {
  TimelineEventsDetailsItem,
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { Note } from '../../../../../common/lib/note';
import { ColumnHeaderOptions, TimelineModel } from '../../../../../timelines/store/timeline/model';
import { AddNoteToEvent, UpdateNote } from '../../../notes/helpers';
import { SkeletonRow } from '../../skeleton_row';
import {
  OnColumnResized,
  OnPinEvent,
  OnRowSelected,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../../events';
import { ExpandableEvent } from '../../expandable_event';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, EventsTrSupplementContainer } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { isEventBuildingBlockType, getEventType } from '../helpers';
import { NoteCards } from '../../../notes/note_cards';
import { useEventDetailsWidthContext } from '../../../../../common/components/events_viewer/event_details_width_context';
import { EventColumnView } from './event_column_view';
import { inputsModel } from '../../../../../common/store';

interface Props {
  actionsColumnWidth: number;
  containerElementRef: HTMLDivElement;
  addNoteToEvent: AddNoteToEvent;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  disableSensorVisibility: boolean;
  docValueFields: DocValueFields[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  getNotesByIds: (noteIds: string[]) => Note[];
  isEventViewer?: boolean;
  loadingEventIds: Readonly<string[]>;
  onColumnResized: OnColumnResized;
  onPinEvent: OnPinEvent;
  onRowSelected: OnRowSelected;
  onUnPinEvent: OnUnPinEvent;
  onUpdateColumns: OnUpdateColumns;
  isEventPinned: boolean;
  refetch: inputsModel.Refetch;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  updateNote: UpdateNote;
}

export const getNewNoteId = (): string => uuid.v4();

const emptyDetails: TimelineEventsDetailsItem[] = [];

/**
 * This is the default row height whenever it is a plain row renderer and not a custom row height.
 * We use this value when we do not know the height of a particular row.
 */
const DEFAULT_ROW_HEIGHT = '32px';

/**
 * This is the top offset in pixels of the top part of the timeline. The UI area where you do your
 * drag and drop and filtering.  It is a positive number in pixels of _PART_ of the header but not
 * the entire header. We leave room for some rows to render behind the drag and drop so they might be
 * visible by the time the user scrolls upwards. All other DOM elements are replaced with their "blank"
 * rows.
 */
const TOP_OFFSET = 50;

/**
 * This is the bottom offset in pixels of the bottom part of the timeline. The UI area right below the
 * timeline which is the footer.  Since the footer is so incredibly small we don't have enough room to
 * render around 5 rows below the timeline to get the user the best chance of always scrolling without seeing
 * "blank rows". The negative number is to give the bottom of the browser window a bit of invisible space to
 * keep around 5 rows rendering below it. All other DOM elements are replaced with their "blank"
 * rows.
 */
const BOTTOM_OFFSET = -500;

const VISIBILITY_SENSOR_OFFSET = { top: TOP_OFFSET, bottom: BOTTOM_OFFSET };

const emptyNotes: string[] = [];

const EventsTrSupplementContainerWrapper = React.memo(({ children }) => {
  const width = useEventDetailsWidthContext();
  return <EventsTrSupplementContainer width={width}>{children}</EventsTrSupplementContainer>;
});

EventsTrSupplementContainerWrapper.displayName = 'EventsTrSupplementContainerWrapper';

const StatefulEventComponent: React.FC<Props> = ({
  actionsColumnWidth,
  addNoteToEvent,
  browserFields,
  containerElementRef,
  columnHeaders,
  columnRenderers,
  disableSensorVisibility = true,
  docValueFields,
  event,
  eventIdToNoteIds,
  getNotesByIds,
  isEventViewer = false,
  isEventPinned = false,
  loadingEventIds,
  onColumnResized,
  onPinEvent,
  onRowSelected,
  onUnPinEvent,
  onUpdateColumns,
  refetch,
  rowRenderers,
  selectedEventIds,
  showCheckboxes,
  timelineId,
  toggleColumn,
  updateNote,
}) => {
  const [expanded, setExpanded] = useState<{ [eventId: string]: boolean }>({});
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const { status: timelineStatus } = useShallowEqualSelector<TimelineModel>(
    (state) => state.timeline.timelineById[timelineId]
  );
  const divElement = useRef<HTMLDivElement | null>(null);
  const [loading, detailsData] = useTimelineEventsDetails({
    docValueFields,
    indexName: event._index!,
    eventId: event._id,
    skip: !expanded[event._id],
  });

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;
    setShowNotes({ ...showNotes, [eventId]: !showNotes[eventId] });
  }, [event, showNotes]);

  const onToggleExpanded = useCallback(() => {
    const eventId = event._id;
    setExpanded({
      ...expanded,
      [eventId]: !expanded[eventId],
    });
  }, [event, expanded]);

  const associateNote = useCallback(
    (noteId: string) => {
      addNoteToEvent({ eventId: event._id, noteId });
      if (!isEventPinned) {
        onPinEvent(event._id); // pin the event, because it has notes
      }
    },
    [addNoteToEvent, event, isEventPinned, onPinEvent]
  );

  // Number of current columns plus one for actions.
  const columnCount = columnHeaders.length + 1;

  const VisibilitySensorContent = useCallback(
    ({ isVisible }) => {
      if (isVisible || disableSensorVisibility) {
        return (
          <EventsTrGroup
            className={STATEFUL_EVENT_CSS_CLASS_NAME}
            data-test-subj="event"
            eventType={getEventType(event.ecs)}
            isBuildingBlockType={isEventBuildingBlockType(event.ecs)}
            showLeftBorder={!isEventViewer}
            ref={divElement}
          >
            <EventColumnView
              id={event._id}
              actionsColumnWidth={actionsColumnWidth}
              associateNote={associateNote}
              columnHeaders={columnHeaders}
              columnRenderers={columnRenderers}
              data={event.data}
              ecsData={event.ecs}
              expanded={!!expanded[event._id]}
              eventIdToNoteIds={eventIdToNoteIds}
              getNotesByIds={getNotesByIds}
              isEventPinned={isEventPinned}
              isEventViewer={isEventViewer}
              loading={loading}
              loadingEventIds={loadingEventIds}
              onColumnResized={onColumnResized}
              onEventToggled={onToggleExpanded}
              onPinEvent={onPinEvent}
              onRowSelected={onRowSelected}
              onUnPinEvent={onUnPinEvent}
              refetch={refetch}
              selectedEventIds={selectedEventIds}
              showCheckboxes={showCheckboxes}
              showNotes={!!showNotes[event._id]}
              timelineId={timelineId}
              toggleShowNotes={onToggleShowNotes}
              updateNote={updateNote}
            />

            <EventsTrSupplementContainerWrapper>
              <EventsTrSupplement
                className="siemEventsTable__trSupplement--notes"
                data-test-subj="event-notes-flex-item"
              >
                <NoteCards
                  associateNote={associateNote}
                  data-test-subj="note-cards"
                  getNewNoteId={getNewNoteId}
                  getNotesByIds={getNotesByIds}
                  noteIds={eventIdToNoteIds[event._id] || emptyNotes}
                  showAddNote={!!showNotes[event._id]}
                  status={timelineStatus}
                  toggleShowAddNote={onToggleShowNotes}
                  updateNote={updateNote}
                />
              </EventsTrSupplement>

              {getRowRenderer(event.ecs, rowRenderers).renderRow({
                browserFields,
                data: event.ecs,
                timelineId,
              })}

              <EventsTrSupplement
                className="siemEventsTable__trSupplement--attributes"
                data-test-subj="event-details"
              >
                <ExpandableEvent
                  browserFields={browserFields}
                  columnHeaders={columnHeaders}
                  event={detailsData || emptyDetails}
                  forceExpand={!!expanded[event._id] && !loading}
                  id={event._id}
                  onEventToggled={onToggleExpanded}
                  onUpdateColumns={onUpdateColumns}
                  timelineId={timelineId}
                  toggleColumn={toggleColumn}
                />
              </EventsTrSupplement>
            </EventsTrSupplementContainerWrapper>
          </EventsTrGroup>
        );
      } else {
        // Height place holder for visibility detection as well as re-rendering sections.
        const height =
          divElement.current != null && divElement.current!.clientHeight
            ? `${divElement.current!.clientHeight}px`
            : DEFAULT_ROW_HEIGHT;

        return <SkeletonRow cellCount={columnCount} rowHeight={height} />;
      }
    },
    [
      actionsColumnWidth,
      associateNote,
      browserFields,
      columnCount,
      columnHeaders,
      columnRenderers,
      detailsData,
      disableSensorVisibility,
      event._id,
      event.data,
      event.ecs,
      eventIdToNoteIds,
      expanded,
      getNotesByIds,
      isEventPinned,
      isEventViewer,
      loading,
      loadingEventIds,
      onColumnResized,
      onPinEvent,
      onRowSelected,
      onToggleExpanded,
      onToggleShowNotes,
      onUnPinEvent,
      onUpdateColumns,
      refetch,
      rowRenderers,
      selectedEventIds,
      showCheckboxes,
      showNotes,
      timelineId,
      timelineStatus,
      toggleColumn,
      updateNote,
    ]
  );

  return (
    <VisibilitySensor
      partialVisibility={true}
      scrollCheck={true}
      containment={containerElementRef}
      offset={VISIBILITY_SENSOR_OFFSET}
    >
      {VisibilitySensorContent}
    </VisibilitySensor>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
