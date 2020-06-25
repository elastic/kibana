/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniqBy } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { NotePreview } from './note_preview';
import { TimelineResultNote } from '../types';

const NotePreviewsContainer = styled.section`
  padding: ${(props) =>
    `${props.theme.eui.euiSizeS} 0 ${props.theme.eui.euiSizeS} ${props.theme.eui.euiSizeXXL}`};
`;

NotePreviewsContainer.displayName = 'NotePreviewsContainer';

/**
 * Renders a preview of a note in the All / Open Timelines table
 */
export const NotePreviews = React.memo<{
  notes?: TimelineResultNote[] | null;
}>(({ notes }) => {
  if (notes == null || notes.length === 0) {
    return null;
  }

  const uniqueNotes = uniqBy('savedObjectId', notes);

  return (
    <NotePreviewsContainer data-test-subj="note-previews-container">
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

NotePreviews.displayName = 'NotePreviews';
