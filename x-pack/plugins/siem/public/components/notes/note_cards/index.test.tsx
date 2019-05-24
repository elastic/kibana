/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { Note } from '../../../lib/note';

import { NoteCards } from '.';

describe('NoteCards', () => {
  const noteIds = ['abc', 'def'];

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

  test('it renders the notes column when noteIds are specified', () => {
    const wrapper = mountWithIntl(
      <NoteCards
        associateNote={jest.fn()}
        getNotesByIds={getNotesByIds}
        getNewNoteId={jest.fn()}
        noteIds={noteIds}
        showAddNote={true}
        toggleShowAddNote={jest.fn()}
        updateNote={jest.fn()}
        width="100%"
      />
    );

    expect(wrapper.find('[data-test-subj="notes"]').exists()).toEqual(true);
  });

  test('it does NOT render the notes column when noteIds are NOT specified', () => {
    const wrapper = mountWithIntl(
      <NoteCards
        associateNote={jest.fn()}
        getNotesByIds={getNotesByIds}
        getNewNoteId={jest.fn()}
        noteIds={[]}
        showAddNote={true}
        toggleShowAddNote={jest.fn()}
        updateNote={jest.fn()}
        width="100%"
      />
    );

    expect(wrapper.find('[data-test-subj="notes"]').exists()).toEqual(false);
  });

  test('renders note cards', () => {
    const wrapper = mountWithIntl(
      <NoteCards
        associateNote={jest.fn()}
        getNotesByIds={getNotesByIds}
        getNewNoteId={jest.fn()}
        noteIds={noteIds}
        showAddNote={true}
        toggleShowAddNote={jest.fn()}
        updateNote={jest.fn()}
        width="100%"
      />
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
      <NoteCards
        associateNote={jest.fn()}
        getNotesByIds={getNotesByIds}
        getNewNoteId={jest.fn()}
        noteIds={noteIds}
        showAddNote={true}
        toggleShowAddNote={jest.fn()}
        updateNote={jest.fn()}
        width="100%"
      />
    );

    expect(wrapper.find('[data-test-subj="add-note"]').exists()).toEqual(true);
  });

  test('it does NOT show controls for adding notes when showAddNote is false', () => {
    const wrapper = mountWithIntl(
      <NoteCards
        associateNote={jest.fn()}
        getNotesByIds={getNotesByIds}
        getNewNoteId={jest.fn()}
        noteIds={noteIds}
        showAddNote={false}
        toggleShowAddNote={jest.fn()}
        updateNote={jest.fn()}
        width="100%"
      />
    );

    expect(wrapper.find('[data-test-subj="add-note"]').exists()).toEqual(false);
  });
});
