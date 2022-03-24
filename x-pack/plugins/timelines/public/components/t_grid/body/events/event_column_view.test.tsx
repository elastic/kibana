/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { getActionsColumnWidth } from '../column_headers/helpers';

import { EventColumnView } from './event_column_view';
import { TestCellRenderer } from '../../../../mock/cell_renderer';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { TestProviders } from '../../../../mock/test_providers';
import { testLeadingControlColumn } from '../../../../mock/mock_timeline_control_columns';
import { mockGlobalState } from '../../../../mock/global_state';

jest.mock('../../../../hooks/use_selector', () => ({
  useShallowEqualSelector: () => mockGlobalState.timelineById.test,
  useDeepEqualSelector: () => mockGlobalState.timelineById.test,
}));

describe('EventColumnView', () => {
  const ACTION_BUTTON_COUNT = 4;
  const props = {
    ariaRowindex: 2,
    id: 'event-id',
    actionsColumnWidth: getActionsColumnWidth(ACTION_BUTTON_COUNT),
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
    onEventDetailsPanelOpened: jest.fn(),
    onPinEvent: jest.fn(),
    onRowSelected: jest.fn(),
    onUnPinEvent: jest.fn(),
    refetch: jest.fn(),
    renderCellValue: TestCellRenderer,
    selectedEventIds: {},
    showCheckboxes: false,
    showNotes: false,
    tabType: TimelineTabs.query,
    timelineId: TimelineId.active,
    toggleShowNotes: jest.fn(),
    updateNote: jest.fn(),
    isEventPinned: false,
    leadingControlColumns: [],
    trailingControlColumns: [],
    setEventsLoading: jest.fn(),
    setEventsDeleted: jest.fn(),
  };

  // TODO: next 3 tests will be re-enabled in the future.
  test.skip('it render AddToCaseAction if timelineId === TimelineId.detectionsPage', () => {
    const wrapper = mount(<EventColumnView {...props} timelineId={TimelineId.detectionsPage} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeTruthy();
  });

  test.skip('it render AddToCaseAction if timelineId === TimelineId.detectionsRulesDetailsPage', () => {
    const wrapper = mount(
      <EventColumnView {...props} timelineId={TimelineId.detectionsRulesDetailsPage} />,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeTruthy();
  });

  test.skip('it render AddToCaseAction if timelineId === TimelineId.active', () => {
    const wrapper = mount(<EventColumnView {...props} timelineId={TimelineId.active} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeTruthy();
  });

  test.skip('it does NOT render AddToCaseAction when timelineId is not in the allowed list', () => {
    const wrapper = mount(<EventColumnView {...props} timelineId="timeline-test" />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeFalsy();
  });

  test('it renders a custom control column in addition to the default control column', () => {
    const wrapper = mount(
      <EventColumnView
        {...props}
        timelineId="timeline-test"
        leadingControlColumns={[testLeadingControlColumn]}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('[data-test-subj="test-body-control-column-cell"]').exists()).toBeTruthy();
  });
});
