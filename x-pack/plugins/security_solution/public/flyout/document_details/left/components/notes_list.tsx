/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  EuiButtonIcon,
  EuiComment,
  EuiCommentList,
  EuiLoadingElastic,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  ADD_NOTE_LOADING_TEST_ID,
  DELETE_NOTE_BUTTON_TEST_ID,
  NOTES_COMMENT_TEST_ID,
  NOTES_LOADING_TEST_ID,
} from './test_ids';
import type { State } from '../../../../common/store';
import type { Note } from '../../../../../common/api/timeline';
import {
  deleteNote,
  ReqStatus,
  selectCreateNoteStatus,
  selectDeleteNoteError,
  selectDeleteNoteStatus,
  selectFetchNotesByDocumentIdError,
  selectFetchNotesByDocumentIdStatus,
  selectNotesByDocumentId,
} from '../../../../notes/store/notes.slice';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

export const ADDED_A_NOTE = i18n.translate('xpack.securitySolution.notes.addedANoteLabel', {
  defaultMessage: 'added a note',
});
export const FETCH_NOTES_ERROR = i18n.translate(
  'xpack.securitySolution.notes.fetchNotesErrorLabel',
  {
    defaultMessage: 'Error fetching notes',
  }
);
export const NO_NOTES = i18n.translate('xpack.securitySolution.notes.noNotesLabel', {
  defaultMessage: 'No notes have been created for this document',
});
export const DELETE_NOTE = i18n.translate('xpack.securitySolution.notes.deleteNoteLabel', {
  defaultMessage: 'Delete note',
});
export const DELETE_NOTE_ERROR = i18n.translate(
  'xpack.securitySolution.notes.deleteNoteErrorLabel',
  {
    defaultMessage: 'Error deleting note',
  }
);

export interface NotesListProps {
  /**
   * Id of the document
   */
  eventId: string;
}

/**
 * Renders a list of notes for the document.
 * If a note belongs to a timeline, a timeline icon will be shown the top right corner.
 * Also, a delete icon is shown in the top right corner to delete a note.
 * When a note is being created, the component renders a loading spinner when the new note is about to be added.
 */
export const NotesList = memo(({ eventId }: NotesListProps) => {
  const dispatch = useDispatch();
  const { addError: addErrorToast } = useAppToasts();

  const fetchStatus = useSelector((state: State) => selectFetchNotesByDocumentIdStatus(state));
  const fetchError = useSelector((state: State) => selectFetchNotesByDocumentIdError(state));
  const notes: Note[] = useSelector((state: State) => selectNotesByDocumentId(state, eventId));

  const createStatus = useSelector((state: State) => selectCreateNoteStatus(state));

  const deleteStatus = useSelector((state: State) => selectDeleteNoteStatus(state));
  const deleteError = useSelector((state: State) => selectDeleteNoteError(state));
  const [deletingNoteId, setDeletingNoteId] = useState('');

  const deleteNoteFc = useCallback(
    (noteId: string) => {
      setDeletingNoteId(noteId);
      dispatch(deleteNote({ id: noteId }));
    },
    [dispatch]
  );

  useEffect(() => {
    if (fetchStatus === ReqStatus.Failed && fetchError) {
      addErrorToast(null, {
        title: FETCH_NOTES_ERROR,
      });
    }
  }, [addErrorToast, fetchError, fetchStatus]);

  useEffect(() => {
    if (deleteStatus === ReqStatus.Failed && deleteError) {
      addErrorToast(null, {
        title: DELETE_NOTE_ERROR,
      });
    }
  }, [addErrorToast, deleteError, deleteStatus]);

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
          key={note.noteId}
          username={note.createdBy}
          timestamp={<>{note.created && <FormattedRelative value={new Date(note.created)} />}</>}
          event={ADDED_A_NOTE}
          actions={
            <EuiButtonIcon
              data-test-subj={`${DELETE_NOTE_BUTTON_TEST_ID}-${index}`}
              title={DELETE_NOTE}
              aria-label={DELETE_NOTE}
              color="text"
              iconType="trash"
              onClick={() => deleteNoteFc(note.noteId)}
              disabled={deletingNoteId !== note.noteId && deleteStatus === ReqStatus.Loading}
              isLoading={deletingNoteId === note.noteId && deleteStatus === ReqStatus.Loading}
            />
          }
        >
          <EuiMarkdownFormat textSize="s">{note.note || ''}</EuiMarkdownFormat>
        </EuiComment>
      ))}
      {createStatus === ReqStatus.Loading && (
        <EuiLoadingElastic size="xxl" data-test-subj={ADD_NOTE_LOADING_TEST_ID} />
      )}
    </EuiCommentList>
  );
});

NotesList.displayName = 'NotesList';
