/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import * as i18n from '../translations';

import { EventColumnView } from './event_column_view';
import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { TimelineTabs, TimelineType, TimelineId } from '../../../../../../common/types/timeline';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { getDefaultControlColumn } from '../control_columns';
import { testLeadingControlColumn } from '../../../../../common/mock/mock_timeline_control_columns';
import { mockTimelines } from '../../../../../common/mock/mock_timelines_plugin';
import { getActionsColumnWidth } from '@kbn/timelines-plugin/public';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';

jest.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;
jest.mock('../../../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn(),
  useDeepEqualSelector: jest.fn(),
}));
jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      timelines: { ...mockTimelines },
      data: {
        search: jest.fn(),
        query: jest.fn(),
      },
      application: {
        capabilities: {
          siem: { crud_alerts: true, read_alerts: true },
        },
      },
      cases: mockCasesContract(),
    },
  }),
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
  }),
  useGetUserCasesPermissions: jest.fn(),
}));

describe('EventColumnView', () => {
  useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
  (useShallowEqualSelector as jest.Mock).mockReturnValue(TimelineType.default);
  const ACTION_BUTTON_COUNT = 4;
  const leadingControlColumns = getDefaultControlColumn(ACTION_BUTTON_COUNT);

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
    onRowSelected: jest.fn(),
    refetch: jest.fn(),
    renderCellValue: DefaultCellRenderer,
    selectedEventIds: {},
    showCheckboxes: false,
    showNotes: false,
    tabType: TimelineTabs.query,
    timelineId: TimelineId.active,
    toggleShowNotes: jest.fn(),
    updateNote: jest.fn(),
    isEventPinned: false,
    leadingControlColumns,
    trailingControlColumns: [],
    setEventsLoading: jest.fn(),
    setEventsDeleted: jest.fn(),
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

  test('it renders a custom control column in addition to the default control column', () => {
    const wrapper = mount(
      <EventColumnView
        {...props}
        leadingControlColumns={[testLeadingControlColumn, ...leadingControlColumns]}
      />,
      {
        wrappingComponent: TestProviders,
      }
    );

    expect(wrapper.find('[data-test-subj="expand-event"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="test-body-control-column-cell"]').exists()).toBeTruthy();
  });
});
