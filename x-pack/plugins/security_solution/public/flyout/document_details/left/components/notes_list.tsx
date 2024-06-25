/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiComment, EuiCommentList, EuiLoadingElastic, EuiMarkdownFormat } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { NOTES_COMMENT_TEST_ID, NOTES_LOADING_TEST_ID } from './test_ids';
import type { State } from '../../../../common/store';
import type { Note } from '../../../../../common/api/timeline';
import {
  ReqStatus,
  selectFetchNotesByDocumentIdError,
  selectFetchNotesByDocumentIdStatus,
  selectNotesByDocumentId,
} from '../../../../notes/store/notes.slice';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

export const ADDED_A_NOTE = i18n.translate('xpack.securitySolution.notes.addedANoteLabel', {
  defaultMessage: 'added a note',
});
export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.notes.fetchNoteErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export const NO_NOTES = i18n.translate('xpack.securitySolution.notes.noNotesLabel', {
  defaultMessage: 'No notes have been created for this document',
});

export interface NotesListProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Renders a list of notes for the document.
 * If a note belongs to a timeline, a timeline icon will be shown the top right corner.
 */
export const NotesList = ({ eventId }: NotesListProps) => {
  const { addError: addErrorToast } = useAppToasts();

  const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdError(state));
  const notes: Note[] = useSelector((state: State) => selectNotesByDocumentId(state, eventId));

  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  if (fetchStatus === ReqStatus.Loading) {
    return <EuiLoadingElastic data-test-subj={NOTES_LOADING_TEST_ID} size="xxl" />;
  }

  if (fetchStatus === ReqStatus.Succeeded && notes.length === 0) {
    return <p>{NO_NOTES}</p>;
  }

  return (
    <EuiCommentList>
      {notes.map((note, index) => (
        <EuiComment
          data-test-subj={`${NOTES_COMMENT_TEST_ID}-${index}`}
          key={`note-${index}`}
          username={note.createdBy}
          timestamp={<>{note.created && <FormattedRelative value={new Date(note.created)} />}</>}
          event={ADDED_A_NOTE}
        >
          <EuiMarkdownFormat textSize="s">{note.note || ''}</EuiMarkdownFormat>
        </EuiComment>
      ))}
    </EuiCommentList>
  );
};

NotesList.displayName = 'NotesList';
