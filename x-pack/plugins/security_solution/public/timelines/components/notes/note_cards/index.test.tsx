/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';

import { Note } from '../../../../common/lib/note';

import { NoteCards } from '.';
import { TimelineStatus } from '../../../../../common/types/timeline';

describe('NoteCards', () => {
  const noteIds = ['abc', 'def'];
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  const getNotesByIds = (_: string[]): Note[] => [
    {
      created: new Date(),
      id: 'abc',
      lastEdit: null,
      note: 'a fake note',
      saveObjectId: null,
      user: 'elastic',
      version: null,
    },
    {
      created: new Date(),
      id: 'def',
      lastEdit: null,
      note: 'another fake note',
      saveObjectId: null,
      user: 'elastic',
      version: null,
    },
  ];

  const props = {
    associateNote: jest.fn(),
    getNotesByIds,
    getNewNoteId: jest.fn(),
    noteIds,
    showAddNote: true,
    status: TimelineStatus.active,
    toggleShowAddNote: jest.fn(),
    updateNote: jest.fn(),
  };

  test('it renders the notes column when noteIds are specified', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <NoteCards {...props} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="notes"]').exists()).toEqual(true);
  });

  test('it does NOT render the notes column when noteIds are NOT specified', () => {
    const testProps = { ...props, noteIds: [] };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <NoteCards {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="notes"]').exists()).toEqual(false);
  });

  test('renders note cards', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <NoteCards {...props} />
      </ThemeProvider>
    );

    expect(
      wrapper
        .find('[data-test-subj="note-card"]')
        .find('[data-test-subj="note-card-body"]')
        .find('[data-test-subj="markdown-root"]')
        .first()
        .text()
    ).toEqual(getNotesByIds(noteIds)[0].note);
  });

  test('it shows controls for adding notes when showAddNote is true', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <NoteCards {...props} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="add-note"]').exists()).toEqual(true);
  });

  test('it does NOT show controls for adding notes when showAddNote is false', () => {
    const testProps = { ...props, showAddNote: false };

    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <NoteCards {...testProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="add-note"]').exists()).toEqual(false);
  });
});
