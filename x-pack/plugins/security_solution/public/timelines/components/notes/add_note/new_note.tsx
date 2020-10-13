/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { MarkdownEditor } from '../../../../common/components/markdown_editor';
import { UpdateInternalNewNote } from '../helpers';
import * as i18n from '../translations';

const NewNoteTabs = styled(EuiFlexItem)`
  width: 100%;
`;

NewNoteTabs.displayName = 'NewNoteTabs';

/** An input for entering a new note  */
export const NewNote = React.memo<{
  noteInputHeight: number;
  note: string;
  updateNewNote: UpdateInternalNewNote;
}>(({ note, noteInputHeight, updateNewNote }) => {
  return (
    <NewNoteTabs data-test-subj="new-note-tabs">
      <MarkdownEditor
        ariaLabel={i18n.NOTE}
        onChange={updateNewNote}
        value={note}
        dataTestSubj="add-a-note"
        height={noteInputHeight}
      />
    </NewNoteTabs>
  );
});

NewNote.displayName = 'NewNote';
