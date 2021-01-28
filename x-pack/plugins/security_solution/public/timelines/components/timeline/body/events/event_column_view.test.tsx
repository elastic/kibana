/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */
import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { DEFAULT_ACTIONS_COLUMN_WIDTH } from '../constants';
import * as i18n from '../translations';

import { EventColumnView } from './event_column_view';
import { TimelineTabs, TimelineType, TimelineId } from '../../../../../../common/types/timeline';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';

jest.mock('../../../../../common/hooks/use_selector');

jest.mock('../../../../../cases/components/timeline_actions/add_to_case_action', () => {
  return {
    AddToCaseAction: () => {
      return <div data-test-subj="add-to-case-action">{'Add to case'}</div>;
    },
  };
});

describe('EventColumnView', () => {
  (useShallowEqualSelector as jest.Mock).mockReturnValue(TimelineType.default);

  const props = {
    ariaRowindex: 2,
    id: 'event-id',
    actionsColumnWidth: DEFAULT_ACTIONS_COLUMN_WIDTH,
    associateNote: jest.fn(),
    columnHeaders: [],
    columnRenderers: [],
    data: [
      {
        field: 'host.name',
      },
    ],
    ecsData: {
      _id: 'id',
    },
    eventIdToNoteIds: {},
    expanded: false,
    hasRowRenderers: false,
    loading: false,
    loadingEventIds: [],
    notesCount: 0,
    onEventToggled: jest.fn(),
    onPinEvent: jest.fn(),
    onRowSelected: jest.fn(),
    onUnPinEvent: jest.fn(),
    refetch: jest.fn(),
    selectedEventIds: {},
    showCheckboxes: false,
    showNotes: false,
    tabType: TimelineTabs.query,
    timelineId: TimelineId.active,
    toggleShowNotes: jest.fn(),
    updateNote: jest.fn(),
    isEventPinned: false,
  };

  test('it does NOT render a notes button when isEventsViewer is true', () => {
    const wrapper = mount(<EventColumnView {...props} isEventViewer={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="timeline-notes-button-small"]').exists()).toBe(false);
  });

  test('it invokes toggleShowNotes when the button for adding notes is clicked', () => {
    const wrapper = mount(<EventColumnView {...props} />, { wrappingComponent: TestProviders });

    expect(props.toggleShowNotes).not.toHaveBeenCalled();

    wrapper.find('[data-test-subj="timeline-notes-button-small"]').first().simulate('click');

    expect(props.toggleShowNotes).toHaveBeenCalled();
  });

  test('it renders correct tooltip for NotesButton - timeline', () => {
    const wrapper = mount(<EventColumnView {...props} />, { wrappingComponent: TestProviders });

    expect(wrapper.find('[data-test-subj="add-note"]').prop('toolTip')).toEqual(i18n.NOTES_TOOLTIP);
  });

  test('it renders correct tooltip for NotesButton - timeline template', () => {
    (useShallowEqualSelector as jest.Mock).mockReturnValue(TimelineType.template);

    const wrapper = mount(<EventColumnView {...props} />, { wrappingComponent: TestProviders });

    expect(wrapper.find('[data-test-subj="add-note"]').prop('toolTip')).toEqual(
      i18n.NOTES_DISABLE_TOOLTIP
    );
    (useShallowEqualSelector as jest.Mock).mockReturnValue(TimelineType.default);
  });

  test('it does NOT render a pin button when isEventViewer is true', () => {
    const wrapper = mount(<EventColumnView {...props} isEventViewer={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="pin"]').exists()).toBe(false);
  });

  test('it invokes onPinClicked when the button for pinning events is clicked', () => {
    const wrapper = mount(<EventColumnView {...props} />, { wrappingComponent: TestProviders });

    expect(props.onPinEvent).not.toHaveBeenCalled();

    wrapper.find('[data-test-subj="pin"]').first().simulate('click');

    expect(props.onPinEvent).toHaveBeenCalled();
  });

  test('it render AddToCaseAction if timelineId === TimelineId.detectionsPage', () => {
    const wrapper = mount(<EventColumnView {...props} timelineId={TimelineId.detectionsPage} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeTruthy();
  });

  test('it render AddToCaseAction if timelineId === TimelineId.detectionsRulesDetailsPage', () => {
    const wrapper = mount(
      <EventColumnView {...props} timelineId={TimelineId.detectionsRulesDetailsPage} />,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeTruthy();
  });

  test('it render AddToCaseAction if timelineId === TimelineId.active', () => {
    const wrapper = mount(<EventColumnView {...props} timelineId={TimelineId.active} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeTruthy();
  });

  test('it does NOT render AddToCaseAction when timelineId is not in the allowed list', () => {
    const wrapper = mount(<EventColumnView {...props} timelineId="timeline-test" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeFalsy();
  });
});
