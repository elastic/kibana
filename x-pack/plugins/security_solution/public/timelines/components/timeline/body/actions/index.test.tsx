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

jest.mock('../../../../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('../../../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn(),
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
          onPinEvent={jest.fn()}
          onUnPinEvent={jest.fn()}
          onRowSelected={jest.fn()}
          showNotes={false}
          isEventPinned={false}
          rowIndex={10}
          toggleShowNotes={jest.fn()}
          timelineId={'test'}
          refetch={jest.fn()}
          showCheckboxes={true}
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
          onPinEvent={jest.fn()}
          onUnPinEvent={jest.fn()}
          columnId={''}
          index={2}
          eventId="abc"
          loadingEventIds={[]}
          onEventDetailsPanelOpened={jest.fn()}
          onRowSelected={jest.fn()}
          showCheckboxes={false}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });
});
