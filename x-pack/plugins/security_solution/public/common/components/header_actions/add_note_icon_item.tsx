/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { selectTimelineById } from '../../../timelines/store/selectors';
import { NotesFlyout } from '../../../timelines/components/timeline/properties/notes_flyout';
import { NotesButton } from '../../../timelines/components/timeline/properties/helpers';
import { TimelineType } from '../../../../common/api/timeline';
import { useUserPrivileges } from '../user_privileges';
import * as i18n from './translations';
import { ActionIconItem } from './action_icon_item';
import { appSelectors, inputsSelectors } from '../../store';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import type { Refetch } from '../../types';
import { timelineActions } from '../../../timelines/store';

interface AddEventNoteActionProps {
  ariaLabel?: string;
  eventId?: string;
  refetch?: () => void;
  timelineId: string;
  toggleShowNotes?: () => void;
}

const EMPTY_STRING_ARRAY: string[] = [];

function isNoteNotNull<T>(note: T | null): note is T {
  return note !== null;
}

const AddEventNoteActionComponent: React.FC<AddEventNoteActionProps> = ({
  ariaLabel,
  eventId,
  refetch,
  timelineId,
  toggleShowNotes,
}) => {
  const [areNotesVisible, setAreNotesVisible] = React.useState(false);

  const toggleNotes = useCallback(() => {
    if (toggleShowNotes) {
      toggleShowNotes();
    }
    setAreNotesVisible((prev) => !prev);
  }, [toggleShowNotes]);

  const handleNotesFlyoutClose = useCallback(() => {
    if (toggleShowNotes) {
      toggleShowNotes();
    }
    setAreNotesVisible(false);
  }, [toggleShowNotes]);

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);

  const notesById = useDeepEqualSelector(getNotesByIds);

  const dispatch = useDispatch();

  const timelineSelector = useMemo(() => inputsSelectors.getTimelineSelector(), []);

  const { queries } = useDeepEqualSelector(timelineSelector);

  const { eventIdToNoteIds, timelineType } = useDeepEqualSelector((state) =>
    selectTimelineById(state, timelineId)
  );

  const localRefetch = useCallback(() => {
    queries.forEach((query) => {
      if (query.refetch) {
        (query.refetch as Refetch)();
      }
    });
  }, [queries]);

  const associateNote = useCallback(
    (currentNoteId: string) => {
      if (!eventId) return;
      dispatch(
        timelineActions.addNoteToEvent({
          eventId,
          id: timelineId,
          noteId: currentNoteId,
        })
      );
      if (refetch) {
        refetch();
      }

      localRefetch();
    },
    [dispatch, eventId, refetch, localRefetch, timelineId]
  );

  const noteIds: string[] = useMemo(
    () => (eventIdToNoteIds && eventId && eventIdToNoteIds[eventId]) || EMPTY_STRING_ARRAY,
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
        .filter(isNoteNotNull),
    [noteIds, notesById]
  );

  const { kibanaSecuritySolutionsPrivileges } = useUserPrivileges();

  const NOTES_TOOLTIP = useMemo(
    () =>
      noteIds.length > 0
        ? i18n.NOTES_COUNT_TOOLTIP({ notesCount: noteIds.length })
        : i18n.NOTES_ADD_TOOLTIP,
    [noteIds.length]
  );

  return (
    <>
      <NotesFlyout
        eventId={eventId}
        toggleShowAddNote={toggleNotes}
        associateNote={associateNote}
        notes={notes}
        show={areNotesVisible}
        onClose={handleNotesFlyoutClose}
        timelineId={timelineId}
      />

      <ActionIconItem>
        <NotesButton
          ariaLabel={ariaLabel}
          data-test-subj="add-note"
          isDisabled={kibanaSecuritySolutionsPrivileges.crud === false}
          timelineType={timelineType}
          toggleShowNotes={toggleNotes}
          toolTip={
            timelineType === TimelineType.template ? i18n.NOTES_DISABLE_TOOLTIP : NOTES_TOOLTIP
          }
          eventId={eventId}
          notesCount={noteIds.length}
        />
      </ActionIconItem>
    </>
  );
};

AddEventNoteActionComponent.displayName = 'AddEventNoteActionComponent';

export const AddEventNoteAction = React.memo(AddEventNoteActionComponent);
