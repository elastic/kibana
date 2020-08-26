/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import React from 'react';
import { useSelector } from 'react-redux';

import { TestProviders, mockTimelineModel } from '../../../../../common/mock';
import { DEFAULT_ACTIONS_COLUMN_WIDTH } from '../constants';
import * as i18n from '../translations';

import { Actions } from '.';
import { TimelineType } from '../../../../../../common/types/timeline';

jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  return {
    ...origin,
    useSelector: jest.fn(),
  };
});

describe('Actions', () => {
  (useSelector as jest.Mock).mockReturnValue(mockTimelineModel);

  test('it renders a checkbox for selecting the event when `showCheckboxes` is `true`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={true}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toEqual(true);
  });

  test('it does NOT render a checkbox for selecting the event when `showCheckboxes` is `false`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });

  test('it renders a button for expanding the event', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="expand-event"]').exists()).toEqual(true);
  });

  test('it invokes onEventToggled when the button to expand an event is clicked', () => {
    const onEventToggled = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={onEventToggled}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="expand-event"]').first().simulate('click');

    expect(onEventToggled).toBeCalled();
  });

  test('it does NOT render a notes button when isEventsViewer is true', () => {
    const toggleShowNotes = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          isEventViewer={true}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={toggleShowNotes}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="timeline-notes-button-small"]').exists()).toBe(false);
  });

  test('it invokes toggleShowNotes when the button for adding notes is clicked', () => {
    const toggleShowNotes = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={toggleShowNotes}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="timeline-notes-button-small"]').first().simulate('click');

    expect(toggleShowNotes).toBeCalled();
  });

  test('it renders correct tooltip for NotesButton - timeline', () => {
    const toggleShowNotes = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={toggleShowNotes}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="add-note"]').prop('toolTip')).toEqual(i18n.NOTES_TOOLTIP);
  });

  test('it renders correct tooltip for NotesButton - timeline template', () => {
    (useSelector as jest.Mock).mockReturnValue({
      ...mockTimelineModel,
      timelineType: TimelineType.template,
    });
    const toggleShowNotes = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={toggleShowNotes}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="add-note"]').prop('toolTip')).toEqual(
      i18n.NOTES_DISABLE_TOOLTIP
    );
    (useSelector as jest.Mock).mockReturnValue(mockTimelineModel);
  });

  test('it does NOT render a pin button when isEventViewer is true', () => {
    const onPinClicked = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          isEventViewer={true}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={onPinClicked}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="pin"]').exists()).toBe(false);
  });

  test('it invokes onPinClicked when the button for pinning events is clicked', () => {
    const onPinClicked = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Actions
          actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
          associateNote={jest.fn()}
          checked={false}
          expanded={false}
          eventId="abc"
          eventIsPinned={false}
          getNotesByIds={jest.fn()}
          loading={false}
          loadingEventIds={[]}
          noteIds={[]}
          onEventToggled={jest.fn()}
          onPinClicked={onPinClicked}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          showNotes={false}
          toggleShowNotes={jest.fn()}
          updateNote={jest.fn()}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="pin"]').first().simulate('click');

    expect(onPinClicked).toHaveBeenCalled();
  });
});
