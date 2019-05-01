/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiTabbedContent, EuiTextArea } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Markdown } from '../../markdown';
import { UpdateInternalNewNote } from '../helpers';
import * as i18n from '../translations';

const NewNoteTabs = styled(EuiTabbedContent)`
  width: 100%;
`;

const MarkdownContainer = styled(EuiPanel)<{ height: number }>`
  height: ${({ height }) => height}px;
  overflow: auto;
`;

const TextArea = styled(EuiTextArea)<{ height: number }>`
  min-height: ${({ height }) => `${height}px`};
  width: 100%;
`;

/** An input for entering a new note  */
export const NewNote = pure<{
  noteInputHeight: number;
  note: string;
  updateNewNote: UpdateInternalNewNote;
}>(({ note, noteInputHeight, updateNewNote }) => {
  const tabs = [
    {
      id: 'note',
      name: i18n.NOTE(1),
      content: (
        <TextArea
          autoFocus
          aria-label={i18n.NOTE(1)}
          data-test-subj="add-a-note"
          fullWidth={true}
          height={noteInputHeight}
          onChange={e => updateNewNote(e.target.value)}
          placeholder={i18n.ADD_A_NOTE}
          spellCheck={true}
          value={note}
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
          <Markdown raw={note} />
        </MarkdownContainer>
      ),
    },
  ];

  return <NewNoteTabs data-test-subj="new-note-tabs" tabs={tabs} initialSelectedTab={tabs[0]} />;
});
