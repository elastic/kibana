/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniqBy } from 'lodash/fp';
import { EuiAvatar, EuiCommentList } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { TimelineResultNote } from '../types';
import { getEmptyValue, defaultToEmptyTag } from '../../../../common/components/empty_value';
import { MarkdownRenderer } from '../../../../common/components/markdown_editor';

export const NotePreviewsContainer = styled.section`
  padding-top: ${({ theme }) => `${theme.eui.euiSizeS}`};
`;

NotePreviewsContainer.displayName = 'NotePreviewsContainer';

/**
 * Renders a preview of a note in the All / Open Timelines table
 */
export const NotePreviews = React.memo<{
  notes?: TimelineResultNote[] | null;
}>(({ notes }) => {
  const notesList = useMemo(
    () =>
      uniqBy('savedObjectId', notes).map((note) => ({
        'data-test-subj': `note-preview-${note.savedObjectId}`,
        username: defaultToEmptyTag(note.updatedBy),
        event: 'added a comment',
        timestamp: note.updated ? (
          <FormattedRelative data-test-subj="updated" value={new Date(note.updated)} />
        ) : (
          getEmptyValue()
        ),
        children: <MarkdownRenderer>{note.note ?? ''}</MarkdownRenderer>,
        timelineIcon: (
          <EuiAvatar
            data-test-subj="avatar"
            name={note.updatedBy != null ? note.updatedBy : '?'}
            size="l"
          />
        ),
      })),
    [notes]
  );

  if (notes == null || notes.length === 0) {
    return null;
  }

  return <EuiCommentList comments={notesList} />;
});

NotePreviews.displayName = 'NotePreviews';
