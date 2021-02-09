/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { BrowserFields } from '../../../../../common/containers/source';
import {
  TimelineItem,
  TimelineNonEcsData,
} from '../../../../../../common/search_strategy/timeline';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnPinEvent, OnRowSelected } from '../../events';
import { STATEFUL_EVENT_CSS_CLASS_NAME } from '../../helpers';
import { EventsTrGroup, EventsTrSupplement, EventsTrSupplementContainer } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { RowRenderer } from '../renderers/row_renderer';
import { isEventBuildingBlockType, getEventType, isEvenEqlSequence } from '../helpers';
import { NoteCards } from '../../../notes/note_cards';
import { useEventDetailsWidthContext } from '../../../../../common/components/events_viewer/event_details_width_context';
import { EventColumnView } from './event_column_view';
import { appSelectors, inputsModel } from '../../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../../store/timeline';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { TimelineResultNote } from '../../../open_timeline/types';
import { getRowRenderer } from '../renderers/get_row_renderer';
import { StatefulRowRenderer } from './stateful_row_renderer';
import { NOTES_BUTTON_CLASS_NAME } from '../../properties/helpers';
import { timelineDefaults } from '../../../../store/timeline/defaults';

interface Props {
  actionsColumnWidth: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  event: TimelineItem;
  eventIdToNoteIds: Readonly<Record<string, string[]>>;
  isEventViewer?: boolean;
  lastFocusedAriaColindex: number;
  loadingEventIds: Readonly<string[]>;
  onRowSelected: OnRowSelected;
  isEventPinned: boolean;
  refetch: inputsModel.Refetch;
  ariaRowindex: number;
  onRuleChange?: () => void;
  rowRenderers: RowRenderer[];
  selectedEventIds: Readonly<Record<string, TimelineNonEcsData[]>>;
  showCheckboxes: boolean;
  tabType?: TimelineTabs;
  timelineId: string;
}

const emptyNotes: string[] = [];

const EventsTrSupplementContainerWrapper = React.memo(({ children }) => {
  const width = useEventDetailsWidthContext();
  return <EventsTrSupplementContainer width={width}>{children}</EventsTrSupplementContainer>;
});

EventsTrSupplementContainerWrapper.displayName = 'EventsTrSupplementContainerWrapper';

const StatefulEventComponent: React.FC<Props> = ({
  actionsColumnWidth,
  browserFields,
  containerRef,
  columnHeaders,
  columnRenderers,
  event,
  eventIdToNoteIds,
  isEventViewer = false,
  isEventPinned = false,
  lastFocusedAriaColindex,
  loadingEventIds,
  onRowSelected,
  refetch,
  onRuleChange,
  rowRenderers,
  ariaRowindex,
  selectedEventIds,
  showCheckboxes,
  tabType,
  timelineId,
}) => {
  const trGroupRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const [showNotes, setShowNotes] = useState<{ [eventId: string]: boolean }>({});
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const expandedEvent = useDeepEqualSelector(
    (state) =>
      (getTimeline(state, timelineId) ?? timelineDefaults).expandedEvent[
        tabType ?? TimelineTabs.query
      ] ?? {}
  );
  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
  const notesById = useDeepEqualSelector(getNotesByIds);
  const noteIds: string[] = eventIdToNoteIds[event._id] || emptyNotes;
  const isExpanded = useMemo(() => expandedEvent && expandedEvent.eventId === event._id, [
    event._id,
    expandedEvent,
  ]);

  const notes: TimelineResultNote[] = useMemo(
    () =>
      appSelectors.getNotes(notesById, noteIds).map((note) => ({
        savedObjectId: note.saveObjectId,
        note: note.note,
        noteId: note.id,
        updated: (note.lastEdit ?? note.created).getTime(),
        updatedBy: note.user,
      })),
    [notesById, noteIds]
  );

  const hasRowRenderers: boolean = useMemo(() => getRowRenderer(event.ecs, rowRenderers) != null, [
    event.ecs,
    rowRenderers,
  ]);

  const onToggleShowNotes = useCallback(() => {
    const eventId = event._id;

    setShowNotes((prevShowNotes) => {
      if (prevShowNotes[eventId]) {
        // notes are closing, so focus the notes button on the next tick, after escaping the EuiFocusTrap
        setTimeout(() => {
          const notesButtonElement = trGroupRef.current?.querySelector<HTMLButtonElement>(
            `.${NOTES_BUTTON_CLASS_NAME}`
          );
          notesButtonElement?.focus();
        }, 0);
      }

      return { ...prevShowNotes, [eventId]: !prevShowNotes[eventId] };
    });
  }, [event]);

  const onPinEvent: OnPinEvent = useCallback(
    (eventId) => dispatch(timelineActions.pinEvent({ id: timelineId, eventId })),
    [dispatch, timelineId]
  );

  const onUnPinEvent: OnPinEvent = useCallback(
    (eventId) => dispatch(timelineActions.unPinEvent({ id: timelineId, eventId })),
    [dispatch, timelineId]
  );

  const handleOnEventToggled = useCallback(() => {
    const eventId = event._id;
    const indexName = event._index!;

    dispatch(
      timelineActions.toggleExpandedEvent({
        tabType,
        timelineId,
        event: {
          eventId,
          indexName,
        },
      })
    );

    if (timelineId === TimelineId.active && tabType === TimelineTabs.query) {
      activeTimeline.toggleExpandedEvent({ eventId, indexName });
    }
  }, [dispatch, event._id, event._index, tabType, timelineId]);

  const associateNote = useCallback(
    (noteId: string) => {
      dispatch(timelineActions.addNoteToEvent({ eventId: event._id, id: timelineId, noteId }));
      if (!isEventPinned) {
        onPinEvent(event._id); // pin the event, because it has notes
      }
    },
    [dispatch, event, isEventPinned, onPinEvent, timelineId]
  );

  const RowRendererContent = useMemo(
    () => (
      <EventsTrSupplement>
        <StatefulRowRenderer
          ariaRowindex={ariaRowindex}
          browserFields={browserFields}
          containerRef={containerRef}
          event={event}
          lastFocusedAriaColindex={lastFocusedAriaColindex}
          rowRenderers={rowRenderers}
          timelineId={timelineId}
        />
      </EventsTrSupplement>
    ),
    [
      ariaRowindex,
      browserFields,
      containerRef,
      event,
      lastFocusedAriaColindex,
      rowRenderers,
      timelineId,
    ]
  );

  return (
    <EventsTrGroup
      $ariaRowindex={ariaRowindex}
      className={STATEFUL_EVENT_CSS_CLASS_NAME}
      data-test-subj="event"
      eventType={getEventType(event.ecs)}
      isBuildingBlockType={isEventBuildingBlockType(event.ecs)}
      isEvenEqlSequence={isEvenEqlSequence(event.ecs)}
      isExpanded={isExpanded}
      ref={trGroupRef}
      showLeftBorder={!isEventViewer}
    >
      <EventColumnView
        id={event._id}
        actionsColumnWidth={actionsColumnWidth}
        ariaRowindex={ariaRowindex}
        columnHeaders={columnHeaders}
        columnRenderers={columnRenderers}
        data={event.data}
        ecsData={event.ecs}
        eventIdToNoteIds={eventIdToNoteIds}
        expanded={isExpanded}
        hasRowRenderers={hasRowRenderers}
        isEventPinned={isEventPinned}
        isEventViewer={isEventViewer}
        loadingEventIds={loadingEventIds}
        notesCount={notes.length}
        onEventToggled={handleOnEventToggled}
        onPinEvent={onPinEvent}
        onRowSelected={onRowSelected}
        onUnPinEvent={onUnPinEvent}
        refetch={refetch}
        onRuleChange={onRuleChange}
        selectedEventIds={selectedEventIds}
        showCheckboxes={showCheckboxes}
        showNotes={!!showNotes[event._id]}
        tabType={tabType}
        timelineId={timelineId}
        toggleShowNotes={onToggleShowNotes}
      />

      <EventsTrSupplementContainerWrapper>
        <EventsTrSupplement
          className="siemEventsTable__trSupplement--notes"
          data-test-subj="event-notes-flex-item"
        >
          <NoteCards
            ariaRowindex={ariaRowindex}
            associateNote={associateNote}
            data-test-subj="note-cards"
            notes={notes}
            showAddNote={!!showNotes[event._id]}
            toggleShowAddNote={onToggleShowNotes}
          />
        </EventsTrSupplement>

        {RowRendererContent}
      </EventsTrSupplementContainerWrapper>
    </EventsTrGroup>
  );
};

export const StatefulEvent = React.memo(StatefulEventComponent);
