/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { AddNote } from '.';
import { TimelineStatus } from '../../../../../common/types/timeline';

describe('AddNote', () => {
  const note = 'The contents of a new note';
  const props = {
    associateNote: jest.fn(),
    getNewNoteId: jest.fn(),
    newNote: note,
    onCancelAddNote: jest.fn(),
    updateNewNote: jest.fn(),
    updateNote: jest.fn(),
    status: TimelineStatus.active,
  };

  test('renders correctly', () => {
    const wrapper = shallow(<AddNote {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the Cancel button when onCancelAddNote is provided', () => {
    const wrapper = mount(<AddNote {...props} />);

    expect(wrapper.find('[data-test-subj="cancel"]').exists()).toEqual(true);
  });

  test('it invokes onCancelAddNote when the Cancel button is clicked', () => {
    const onCancelAddNote = jest.fn();
    const testProps = {
      ...props,
      onCancelAddNote,
    };

    const wrapper = mount(<AddNote {...testProps} />);

    wrapper.find('[data-test-subj="cancel"]').first().simulate('click');

    expect(onCancelAddNote).toBeCalled();
  });

  test('it does NOT invoke associateNote when the Cancel button is clicked', () => {
    const associateNote = jest.fn();
    const testProps = {
      ...props,
      associateNote,
    };

    const wrapper = mount(<AddNote {...testProps} />);

    wrapper.find('[data-test-subj="cancel"]').first().simulate('click');

    expect(associateNote).not.toBeCalled();
  });

  test('it does NOT render the Cancel button when onCancelAddNote is NOT provided', () => {
    const testProps = {
      ...props,
      onCancelAddNote: undefined,
    };
    const wrapper = mount(<AddNote {...testProps} />);

    expect(wrapper.find('[data-test-subj="cancel"]').exists()).toEqual(false);
  });

  test('it renders the contents of the note', () => {
    const wrapper = mount(<AddNote {...props} />);

    expect(wrapper.find('[data-test-subj="add-a-note"]').first().text()).toEqual(note);
  });

  test('it invokes associateNote when the Add Note button is clicked', () => {
    const associateNote = jest.fn();
    const testProps = {
      ...props,
      newNote: note,
      associateNote,
    };
    const wrapper = mount(<AddNote {...testProps} />);

    wrapper.find('[data-test-subj="add-note"]').first().simulate('click');

    expect(associateNote).toBeCalled();
  });

  test('it invokes getNewNoteId when the Add Note button is clicked', () => {
    const getNewNoteId = jest.fn();
    const testProps = {
      ...props,
      getNewNoteId,
    };

    const wrapper = mount(<AddNote {...testProps} />);

    wrapper.find('[data-test-subj="add-note"]').first().simulate('click');

    expect(getNewNoteId).toBeCalled();
  });

  test('it invokes updateNewNote when the Add Note button is clicked', () => {
    const updateNewNote = jest.fn();
    const testProps = {
      ...props,
      updateNewNote,
    };

    const wrapper = mount(<AddNote {...testProps} />);

    wrapper.find('[data-test-subj="add-note"]').first().simulate('click');

    expect(updateNewNote).toBeCalled();
  });

  test('it invokes updateNote when the Add Note button is clicked', () => {
    const updateNote = jest.fn();
    const testProps = {
      ...props,
      updateNote,
    };
    const wrapper = mount(<AddNote {...testProps} />);

    wrapper.find('[data-test-subj="add-note"]').first().simulate('click');

    expect(updateNote).toBeCalled();
  });

  test('it does NOT display the markdown formatting hint when a note has NOT been entered', () => {
    const testProps = {
      ...props,
      newNote: '',
    };
    const wrapper = mount(<AddNote {...testProps} />);

    expect(wrapper.find('[data-test-subj="markdown-hint"]').first()).toHaveStyleRule(
      'visibility',
      'hidden'
    );
  });

  test('it displays the markdown formatting hint when a note has been entered', () => {
    const testProps = {
      ...props,
      newNote: 'We should see a formatting hint now',
    };
    const wrapper = mount(<AddNote {...testProps} />);

    expect(wrapper.find('[data-test-subj="markdown-hint"]').first()).toHaveStyleRule(
      'visibility',
      'inline'
    );
  });
});
