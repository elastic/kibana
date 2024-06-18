/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useDispatch } from 'react-redux';
import React, { useCallback, useMemo } from 'react';
import { EuiTitle } from '@elastic/eui';
import { getEventIdToNoteIdsSelector } from '../../../timelines/components/timeline/tabs/selectors';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import type { TimelineResultNote } from '../../../timelines/components/open_timeline/types';
import { TimelineId } from '../../../../common/types';
import { timelineActions } from '../../../timelines/store';
import { NoteCards } from '../../../timelines/components/notes/note_cards';
import type { State } from '../../../common/store';
import { appSelectors, inputsSelectors } from '../../../common/store';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface NotesPanelProps extends Record<string, unknown> {
  eventId: string;
  refetch?: () => void;
  onToggleShowNotes: (eventId?: string) => void;
}

const emptyNotes: string[] = [];

export const NotesFlyoutKey = 'notes-flyout' as const;

export interface NotesFlyoutProps extends FlyoutPanelProps {
  key: typeof NotesFlyoutKey;
  params: NotesPanelProps;
}

export const NotesPanel = (params: NotesPanelProps) => {
  const { eventId, refetch, onToggleShowNotes } = params;

  const eventIdToNoteIdsSelector = useMemo(() => getEventIdToNoteIdsSelector(), []);

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);

  const notesById = useDeepEqualSelector(getNotesByIds);
  const eventIdToNoteIds = useDeepEqualSelector((state: State) =>
    eventIdToNoteIdsSelector(state, 'timeline-1')
  );

  const dispatch = useDispatch();

  const timelineSelector = useMemo(() => inputsSelectors.getTimelineSelector(), []);

  const { queries } = useDeepEqualSelector(timelineSelector);

  const localRefetch = useCallback(() => {
    queries.forEach((query) => {
      if (query.refetch) {
        query.refetch();
      }
    });
  }, [queries]);

  const associateNote = useCallback(
    (currentNoteId: string) => {
      dispatch(
        timelineActions.addNoteToEvent({
          eventId,
          id: TimelineId.active,
          noteId: currentNoteId,
        })
      );
      if (refetch) {
        refetch();
      }

      localRefetch();
    },
    [dispatch, eventId, refetch, localRefetch]
  );

  const noteIds: string[] = useMemo(
    () => (eventIdToNoteIds && eventIdToNoteIds[eventId]) || emptyNotes,
    [eventIdToNoteIds, eventId]
  );

  const notes = useMemo(
    () =>
      noteIds
        .map((currentNoteId) => {
          const note = notesById[currentNoteId];
          if (note) {
            return {
              savedObjectId: note.saveObjectId,
              note: note.note,
              noteId: note.id,
              updated: (note.lastEdit ?? note.created).getTime(),
              updatedBy: note.user,
            };
          } else {
            return null;
          }
        })
        .filter((note) => note !== null) as TimelineResultNote[],
    [noteIds, notesById]
  );

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <FlyoutHeader>
        <EuiTitle size="m">
          <h2>{`Notes (${notes.length})`}</h2>
        </EuiTitle>
      </FlyoutHeader>
      <FlyoutBody>
        <NoteCards
          ariaRowindex={0}
          associateNote={associateNote}
          className="notes-in-flyout"
          data-test-subj="note-cards"
          notes={notes ?? []}
          showAddNote={true}
          toggleShowAddNote={onToggleShowNotes}
          eventId={eventId}
        />
      </FlyoutBody>
    </>
  );
};
