/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniqBy } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { NotePreview } from './note_preview';
import { TimelineResultNote } from '../types';

const NotePreviewsContainer = styled.div<{ paddingLeft: number }>`
  padding-left: ${({ paddingLeft }) => `${paddingLeft}px`};
`;

/** The default left-padding of a notes preview */
const DEFAULT_NOTES_PREVIEW_LEFT_PADDING = 28; // px

/** The left padding of a notes preview in a modal */
const MODAL_NOTES_PREVIEW_LEFT_PADDING = 31; // px

/**
 * Renders a preview of a note in the All / Open Timelines table
 */
export const NotePreviews = pure<{
  notes?: TimelineResultNote[] | null;
  isModal: boolean;
}>(({ notes, isModal }) => {
  if (notes == null || notes.length === 0) {
    return null;
  }

  const uniqueNotes = uniqBy('savedObjectId', notes);

  return (
    <NotePreviewsContainer
      data-test-subj="note-previews-container"
      paddingLeft={isModal ? MODAL_NOTES_PREVIEW_LEFT_PADDING : DEFAULT_NOTES_PREVIEW_LEFT_PADDING}
    >
      {uniqueNotes.map(({ note, savedObjectId, updated, updatedBy }) =>
        savedObjectId != null ? (
          <NotePreview
            data-test-subj={`note-preview-${savedObjectId}`}
            key={savedObjectId}
            note={note}
            updated={updated}
            updatedBy={updatedBy}
          />
        ) : null
      )}
    </NotePreviewsContainer>
  );
});
