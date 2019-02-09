/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { Actions } from '.';

describe('Actions', () => {
  test('it renders a button for expanding the event', () => {
    const wrapper = mount(
      <Actions
        associateNote={jest.fn()}
        expanded={false}
        eventId="abc"
        eventIsPinned={false}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        onEventToggled={jest.fn()}
        onPinClicked={jest.fn()}
        showNotes={false}
        toggleShowNotes={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="timeline-action-expand"]').exists()).toEqual(true);
  });

  test('it invokes onEventToggled when the button to expand an event is clicked', () => {
    const onEventToggled = jest.fn();

    const wrapper = mount(
      <Actions
        associateNote={jest.fn()}
        expanded={false}
        eventId="abc"
        eventIsPinned={false}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        onEventToggled={onEventToggled}
        onPinClicked={jest.fn()}
        showNotes={false}
        toggleShowNotes={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="timeline-action-expand"]')
      .first()
      .simulate('click');

    expect(onEventToggled).toBeCalled();
  });

  test('it renders a button for pinning the event', () => {
    const wrapper = mount(
      <Actions
        associateNote={jest.fn()}
        expanded={false}
        eventId="abc"
        eventIsPinned={false}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        onEventToggled={jest.fn()}
        onPinClicked={jest.fn()}
        showNotes={false}
        toggleShowNotes={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="timeline-action-pin"]').exists()).toEqual(true);
  });

  test('it invokes onPinClicked when the button to pin an event is clicked', () => {
    const onPinClicked = jest.fn();

    const wrapper = mount(
      <Actions
        associateNote={jest.fn()}
        expanded={false}
        eventId="abc"
        eventIsPinned={false}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        onEventToggled={jest.fn()}
        onPinClicked={onPinClicked}
        showNotes={false}
        toggleShowNotes={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="timeline-action-pin"]')
      .first()
      .simulate('click');

    expect(onPinClicked).toBeCalled();
  });

  test('it renders a button for adding notes', () => {
    const wrapper = mount(
      <Actions
        associateNote={jest.fn()}
        expanded={false}
        eventId="abc"
        eventIsPinned={false}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        onEventToggled={jest.fn()}
        onPinClicked={jest.fn()}
        showNotes={false}
        toggleShowNotes={jest.fn()}
        updateNote={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="timeline-action-notes-button"]').exists()).toEqual(true);
  });

  test('it invokes toggleShowNotes when the button for adding notes is clicked', () => {
    const toggleShowNotes = jest.fn();

    const wrapper = mount(
      <Actions
        associateNote={jest.fn()}
        expanded={false}
        eventId="abc"
        eventIsPinned={false}
        getNotesByIds={jest.fn()}
        noteIds={[]}
        onEventToggled={jest.fn()}
        onPinClicked={jest.fn()}
        showNotes={false}
        toggleShowNotes={toggleShowNotes}
        updateNote={jest.fn()}
      />
    );

    wrapper
      .find('[data-test-subj="timeline-notes-button-small"]')
      .first()
      .simulate('click');

    expect(toggleShowNotes).toBeCalled();
  });
});
