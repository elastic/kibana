/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { State } from '../../../../common/store';
import { appSelectors } from '../../../../common/store';
import { timelineActions } from '../../../store/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { RowRenderer } from '../../../../../common/types/timeline';
import { EventsTrSupplement } from '../styles';
import { NoteCards } from '../../notes/note_cards';
import { eventIsPinned } from '../body/helpers';
import type { TimelineResultNote } from '../../open_timeline/types';
import { timelineBodySelector } from '../body/selectors';
import { timelineDefaults } from '../../../store/timeline/defaults';

/** This offset begins at two, because the header row counts as "row 1", and aria-rowindex starts at "1" */
const ARIA_ROW_INDEX_OFFSET = 2;

interface Props {
  timelineId: string;
  event: DataTableRecord;
  rowIndex: number;
  onToggleShowNotes: (event: DataTableRecord) => void;
  rowRenderers: RowRenderer[];
  showAddNote: boolean;
}

export const RowDetailsComponent: React.FC<Props> = ({
  event,
  timelineId,
  rowIndex,
  onToggleShowNotes,
  rowRenderers,
  showAddNote,
}) => {
  const dispatch = useDispatch();

  const {
    timeline: { eventIdToNoteIds, excludedRowRendererIds, pinnedEventIds } = timelineDefaults,
  } = useSelector((state: State) => timelineBodySelector(state, timelineId));

  const associateNote = useCallback(
    (noteId: string, eventId: string) => {
      dispatch(timelineActions.addNoteToEvent({ eventId, id: timelineId, noteId }));
      const isEventPinned = eventIsPinned({
        eventId,
        pinnedEventIds,
      });
      if (!isEventPinned) {
        dispatch(timelineActions.pinEvent({ id: timelineId, eventId: event.id }));
      }
    },
    [dispatch, event.id, pinnedEventIds, timelineId]
  );

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);
  const notesById = useDeepEqualSelector(getNotesByIds);
  const getNotes = useCallback(
    (eventId: string) => {
      const noteIds: string[] = eventIdToNoteIds[eventId] || [];
      return appSelectors.getNotes(notesById, noteIds).map((note) => ({
        savedObjectId: note.saveObjectId,
        note: note.note,
        noteId: note.id,
        updated: (note.lastEdit ?? note.created).getTime(),
        updatedBy: note.user,
      })) as unknown as TimelineResultNote[];
    },
    [eventIdToNoteIds, notesById]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);

  // The custom row details is actually a trailing control column cell with
  // a hidden header. This is important for accessibility and markup reasons
  // @see https://fuschia-stretch.glitch.me/ for more
  return (
    <>
      <EventsTrSupplement
        className="siemEventsTable__trSupplement--notes"
        data-test-subj="event-notes-flex-item"
        $display="block"
      >
        <NoteCards
          ariaRowindex={rowIndex + ARIA_ROW_INDEX_OFFSET}
          associateNote={(noteId: string) => associateNote(noteId, event.id)}
          data-test-subj="note-cards"
          notes={getNotes(event.id)}
          showAddNote={showAddNote}
          toggleShowAddNote={() => onToggleShowNotes(event)}
        />
      </EventsTrSupplement>
    </>
  );
};

export const RowDetails = React.memo(RowDetailsComponent);
// eslint-disable-next-line import/no-default-export
export { RowDetails as default };
