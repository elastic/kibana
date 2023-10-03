/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { NewNote } from './new_note';

jest.mock('../../../../common/hooks/use_upselling', () => ({
  useUpsellingMessage: jest.fn(),
}));

describe('NewNote', () => {
  const note = 'The contents of a new note';

  test('renders correctly', () => {
    const wrapper = shallow(
      <NewNote
        noteInputHeight={200}
        note={note}
        updateNewNote={jest.fn()}
        setIsMarkdownInvalid={jest.fn()}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders a text area containing the contents of a new (raw) note', () => {
    const wrapper = mount(
      <NewNote
        noteInputHeight={200}
        note={note}
        updateNewNote={jest.fn()}
        setIsMarkdownInvalid={jest.fn()}
      />
    );

    expect(
      wrapper.find('[data-test-subj="add-a-note"] .euiMarkdownEditorDropZone').first().text()
    ).toEqual(note);
  });
});
