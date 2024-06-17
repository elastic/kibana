/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { AddNewNote } from './add_new_note';
import { NotesList } from './notes_list';
import { appActions, appSelectors } from '../../../../common/store/app';
import { useLeftPanelContext } from '../context';

/**
 * List all the notes for a document id and allows to create new notes associated with that document.
 * Displayed in the document details expandable flyout left section.
 */
export const NotesDetails = memo(() => {
  const dispatch = useDispatch();
  const { eventId } = useLeftPanelContext();
  const { addError: addErrorToast } = useAppToasts();

  const addError = useSelector((state) => appSelectors.selectErrorCreateForDocument(state));
  const deleteError = useSelector((state) => appSelectors.selectErrorDelete(state));

  useEffect(() => {
    if (addError) {
      addErrorToast(null, {
        title: 'Error adding note',
      });
    }
  }, [addErrorToast, addError]);

  useEffect(() => {
    if (deleteError) {
      addErrorToast(null, {
        title: 'Error deleting note',
      });
    }
  }, [addErrorToast, deleteError]);

  // TODO find a better way
  useEffect(() => {
    dispatch(appActions.fetchNotesByDocumentRequest({ documentId: eventId }));
  }, [dispatch, eventId]);

  return (
    <>
      <NotesList eventId={eventId} />
      <EuiSpacer />
      <AddNewNote eventId={eventId} />
    </>
  );
});

NotesDetails.displayName = 'NotesDetails';
