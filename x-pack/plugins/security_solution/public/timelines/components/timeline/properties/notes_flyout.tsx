/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import styled, { createGlobalStyle } from 'styled-components';
import type { Refetch } from '../../../../common/types';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types';
import { timelineActions } from '../../../store';
import { NoteCards } from '../../notes/note_cards';
import { appSelectors, inputsSelectors } from '../../../../common/store';
import * as i18n from './translations';

export interface NotesFlyoutProps {
  eventId?: string;
  refetch?: () => void;
  onToggleShowNotes: (eventId?: string) => void;
  show: boolean;
  onClose: () => void;
  eventIdToNoteIds?: Record<string, string[]>;
}

const emptyNotes: string[] = [];

function isNoteNotNull<T>(note: T | null): note is T {
  return note !== null;
}

export const NotesFlyoutZIndexOverride = createGlobalStyle`
  body:has(.timeline-portal-overlay-mask) .timeline-notes-flyout {
    z-index: 1001 !important;
  }
`;

/*
 * z-index override is needed because otherwise NotesFlyout appears below
 * Timeline Modal as they both have same z-index of 1000
 */
export const NotesFlyoutContainer = styled(EuiFlyout)`
  z-index: 1001 !important;
`;

export const NotesFlyout = React.memo(function NotesFlyout(props: NotesFlyoutProps) {
  const { eventId, refetch, onToggleShowNotes, show, onClose, eventIdToNoteIds } = props;
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(show);

  useEffect(() => {
    setIsFlyoutVisible(show);
  }, [show]);

  const getNotesByIds = useMemo(() => appSelectors.notesByIdsSelector(), []);

  const notesById = useDeepEqualSelector(getNotesByIds);

  const dispatch = useDispatch();

  const timelineSelector = useMemo(() => inputsSelectors.getTimelineSelector(), []);

  const { queries } = useDeepEqualSelector(timelineSelector);

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
    () => (eventIdToNoteIds && eventId && eventIdToNoteIds[eventId]) || emptyNotes,
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

  const notesFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'notesFlyoutTitle',
  });

  if (!isFlyoutVisible) {
    return null;
  }

  return (
    <NotesFlyoutContainer
      ownFocus={false}
      className="timeline-notes-flyout"
      onClose={onClose}
      aria-labelledby={notesFlyoutTitleId}
      maxWidth={750}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.NOTES}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <NoteCards
          ariaRowindex={0}
          associateNote={associateNote}
          className="notes-in-flyout"
          data-test-subj="note-cards"
          notes={notes}
          showAddNote={true}
          toggleShowAddNote={onToggleShowNotes}
          eventId={eventId}
        />
      </EuiFlyoutBody>
    </NotesFlyoutContainer>
  );
});
