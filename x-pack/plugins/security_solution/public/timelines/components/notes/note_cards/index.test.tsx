/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import '../../../../common/mock/formatted_relative';

import { NoteCards } from '.';
import { TimelineStatus } from '../../../../../common/api/timeline';
import { TestProviders } from '../../../../common/mock';
import type { TimelineResultNote } from '../../open_timeline/types';

const getNotesByIds = () => ({
  abc: {
    created: new Date(),
    id: 'abc',
    lastEdit: null,
    note: 'a fake note',
    saveObjectId: null,
    user: 'elastic',
    version: null,
  },
  def: {
    created: new Date(),
    id: 'def',
    lastEdit: null,
    note: 'another fake note',
    saveObjectId: null,
    user: 'elastic',
    version: null,
  },
});

jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn().mockReturnValue(getNotesByIds()),
}));

describe('NoteCards', () => {
  const notes: TimelineResultNote[] = Object.entries(getNotesByIds()).map(
    ([_, { created, id, note, saveObjectId, user }]) => ({
      saveObjectId,
      note,
      noteId: id,
      updated: created.getTime(),
      updatedBy: user,
    })
  );

  const props = {
    associateNote: jest.fn(),
    ariaRowindex: 2,
    getNotesByIds,
    getNewNoteId: jest.fn(),
    notes: [],
    showAddNote: true,
    status: TimelineStatus.active,
    toggleShowAddNote: jest.fn(),
    updateNote: jest.fn(),
  };

  test('it renders the notes column when notes are specified', () => {
    const wrapper = mount(
      <TestProviders>
        <NoteCards {...props} notes={notes} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="notes"]').exists()).toEqual(true);
  });

  test('it does NOT render the notes column when notes are NOT specified', () => {
    const wrapper = mount(
      <TestProviders>
        <NoteCards {...props} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="notes"]').exists()).toEqual(false);
  });

  test('renders note cards', () => {
    const wrapper = mount(
      <TestProviders>
        <NoteCards {...props} notes={notes} />
      </TestProviders>
    );

    expect(wrapper.find('.euiCommentEvent__body .euiMarkdownFormat').first().text()).toEqual(
      getNotesByIds().abc.note
    );
  });

  test('renders the expected screenreader only text', () => {
    const wrapper = mount(
      <TestProviders>
        <NoteCards {...props} notes={notes} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="screenReaderOnly"]').first().text()).toEqual(
      'You are viewing notes for the event in row 2. Press the up arrow key when finished to return to the event.'
    );
  });

  test('it shows controls for adding notes when showAddNote is true', () => {
    const wrapper = mount(
      <TestProviders>
        <NoteCards {...props} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="add-note"]').exists()).toEqual(true);
  });

  test('it does NOT show controls for adding notes when showAddNote is false', () => {
    const testProps = { ...props, showAddNote: false };

    const wrapper = mount(
      <TestProviders>
        <NoteCards {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="add-note"]').exists()).toEqual(false);
  });
});
