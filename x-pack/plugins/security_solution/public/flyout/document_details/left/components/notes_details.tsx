/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { NotesList } from './notes_list';
import { fetchNotesByDocumentId } from '../../../../notes/store/notes.slice';
import { useLeftPanelContext } from '../context';

/**
 * List all the notes for a document id and allows to create new notes associated with that document.
 * Displayed in the document details expandable flyout left section.
 */
export const NotesDetails = memo(() => {
  const dispatch = useDispatch();
  const { eventId } = useLeftPanelContext();

  useEffect(() => {
    dispatch(fetchNotesByDocumentId({ documentId: eventId }));
  }, [dispatch, eventId]);

  return <NotesList eventId={eventId} />;
});

NotesDetails.displayName = 'NotesDetails';
