/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiTabbedContent, EuiTextArea } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { MarkdownRenderer, MarkdownEditor } from '../../../../common/components/markdown_editor';
import { UpdateInternalNewNote } from '../helpers';
import * as i18n from '../translations';

const NewNoteTabs = styled(EuiTabbedContent)`
  width: 100%;
`;

NewNoteTabs.displayName = 'NewNoteTabs';

const MarkdownContainer = styled(EuiPanel)<{ height: number }>`
  height: ${({ height }) => height}px;
  overflow: auto;
`;

MarkdownContainer.displayName = 'MarkdownContainer';

const TextArea = styled(EuiTextArea)<{ height: number }>`
  min-height: ${({ height }) => `${height}px`};
  width: 100%;
`;

TextArea.displayName = 'TextArea';

/** An input for entering a new note  */
export const NewNote = React.memo<{
  noteInputHeight: number;
  note: string;
  updateNewNote: UpdateInternalNewNote;
}>(({ note, noteInputHeight, updateNewNote }) => {
  const tabs = [
    {
      id: 'note',
      name: i18n.NOTE,
      content: (
        <MarkdownEditor
          ariaLabel={i18n.NOTE}
          onChange={updateNewNote}
          value={note}
          dataTestSubj="add-a-note"
          height={noteInputHeight}
        />
      ),
    },
    {
      id: 'preview',
      name: i18n.PREVIEW_MARKDOWN,
      content: (
        <MarkdownContainer
          data-test-subj="markdown-container"
          height={noteInputHeight}
          paddingSize="s"
        >
          <MarkdownRenderer>{note}</MarkdownRenderer>
        </MarkdownContainer>
      ),
    },
  ];

  return <NewNoteTabs data-test-subj="new-note-tabs" tabs={tabs} initialSelectedTab={tabs[0]} />;
});

NewNote.displayName = 'NewNote';
