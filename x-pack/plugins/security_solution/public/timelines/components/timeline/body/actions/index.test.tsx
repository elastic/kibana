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
import { mockTimelines } from '../../../../../common/mock/mock_timelines_plugin';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { mockCasesContract } from '../../../../../../../cases/public/mocks';

jest.mock('../../../../../detections/components/user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));
jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../../../common/hooks/use_selector', () => ({
  useShallowEqualSelector: jest.fn().mockReturnValue(mockTimelineModel),
}));
jest.mock(
  '../../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline',
  () => ({
    useInvestigateInTimeline: jest.fn().mockReturnValue({
      investigateInTimelineActionItems: [],
      investigateInTimelineAlertClick: jest.fn(),
      showInvestigateInTimelineAction: false,
    }),
  })
);

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
      cases: mockCasesContract(),
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

const defaultProps = {
  ariaRowindex: 2,
  checked: false,
  columnId: '',
  columnValues: 'abc def',
  data: mockTimelineData[0].data,
  ecsData: mockTimelineData[0].ecs,
  eventId: 'abc',
  eventIdToNoteIds: {},
  index: 2,
  isEventPinned: false,
  loadingEventIds: [],
  onEventDetailsPanelOpened: () => {},
  onRowSelected: () => {},
  refetch: () => {},
  rowIndex: 10,
  setEventsDeleted: () => {},
  setEventsLoading: () => {},
  showCheckboxes: true,
  showNotes: false,
  timelineId: 'test',
  toggleShowNotes: () => {},
};

describe('Actions', () => {
  test('it renders a checkbox for selecting the event when `showCheckboxes` is `true`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toEqual(true);
  });

  test('it does NOT render a checkbox for selecting the event when `showCheckboxes` is `false`', () => {
    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} showCheckboxes={false} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });

  test('it does NOT render a checkbox for selecting the event when `tGridEnabled` is `true`', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const wrapper = mount(
      <TestProviders>
        <Actions {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="select-event"]').exists()).toBe(false);
  });
  describe('Alert context menu enabled?', () => {
    test('it disables for eventType=raw', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(true);
    });
    test('it enables for eventType=signal', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        kibana: { alert: { rule: { uuid: ['123'], parameters: {} } } },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(false);
    });
    test('it disables for event.kind: undefined and agent.type: endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        agent: { type: ['endpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(true);
    });
    test('it enables for event.kind: event and agent.type: endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['event'] },
        agent: { type: ['endpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(false);
    });
    test('it disables for event.kind: alert and agent.type: endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(true);
    });
    test('it shows the analyze event button when the event is from an endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entity_id: ['1'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="view-in-analyzer"]').exists()).toBe(true);
    });
    test('it does not render the analyze event button when the event is from an unsupported source', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['notendpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="view-in-analyzer"]').exists()).toBe(false);
    });
  });
});
