/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders, mockTimelineModel, mockTimelineData } from '../../../../../common/mock';
import { Actions } from '.';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { mockTimelines } from '../../../../../common/mock/mock_timelines_plugin';

jest.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('../../../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn(),
}));

jest.mock('@kbn/alerts', () => ({
  useGetUserAlertsPermissions: () => ({
    loading: false,
    crud: true,
    read: true,
  }),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToApp: jest.fn(),
        getUrlForApp: jest.fn(),
        capabilities: {
          siem: { crud_alerts: true, read_alerts: true },
        },
      },
      uiSettings: {
        get: jest.fn(),
      },
      savedObjects: {
        client: {},
      },
      timelines: { ...mockTimelines },
    },
  }),
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
  }),
  useGetUserCasesPermissions: jest.fn(),
}));

describe('Actions', () => {
  beforeEach(() => {
    (useShallowEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
    useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
  });

  test('it renders a checkbox for selecting the event when `showCheckboxes` is `true`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          ariaRowindex={2}
          columnId={''}
          index={2}
          checked={false}
          columnValues={'abc def'}
          data={mockTimelineData[0].data}
          ecsData={mockTimelineData[0].ecs}
          eventIdToNoteIds={{}}
          eventId="abc"
          loadingEventIds={[]}
          onEventDetailsPanelOpened={jest.fn()}
          onRowSelected={jest.fn()}
          showNotes={false}
          isEventPinned={false}
          rowIndex={10}
          toggleShowNotes={jest.fn()}
          timelineId={'test'}
          refetch={jest.fn()}
          showCheckboxes={true}
          setEventsLoading={jest.fn()}
          setEventsDeleted={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toEqual(true);
  });

  test('it does NOT render a checkbox for selecting the event when `showCheckboxes` is `false`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions
          ariaRowindex={2}
          checked={false}
          columnValues={'abc def'}
          data={mockTimelineData[0].data}
          ecsData={mockTimelineData[0].ecs}
          eventIdToNoteIds={{}}
          showNotes={false}
          isEventPinned={false}
          rowIndex={10}
          toggleShowNotes={jest.fn()}
          timelineId={'test'}
          refetch={jest.fn()}
          columnId={''}
          index={2}
          eventId="abc"
          loadingEventIds={[]}
          onEventDetailsPanelOpened={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
          setEventsLoading={jest.fn()}
          setEventsDeleted={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });

  test('it does NOT render a checkbox for selecting the event when `tGridEnabled` is `true`', () => {
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

    const wrapper = mount(
      <TestProviders>
        <Actions
          ariaRowindex={2}
          checked={false}
          columnValues={'abc def'}
          data={mockTimelineData[0].data}
          ecsData={mockTimelineData[0].ecs}
          eventIdToNoteIds={{}}
          showNotes={false}
          isEventPinned={false}
          rowIndex={10}
          toggleShowNotes={jest.fn()}
          timelineId={'test'}
          refetch={jest.fn()}
          columnId={''}
          index={2}
          eventId="abc"
          loadingEventIds={[]}
          onEventDetailsPanelOpened={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={true}
          setEventsLoading={jest.fn()}
          setEventsDeleted={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });
});
