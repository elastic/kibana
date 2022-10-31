/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TableId, TimelineId } from '../../../../../../common/types/timeline';
import { TestProviders, mockTimelineModel, mockTimelineData } from '../../../../../common/mock';
import { Actions, isAlert } from '.';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { useShallowEqualSelector } from '../../../../../common/hooks/use_selector';
import { licenseService } from '../../../../../common/hooks/use_license';

jest.mock('../../../../../detections/components/user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));
jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../../../common/hooks/use_selector');
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

jest.mock('../../../../../common/lib/kibana', () => {
  const originalKibanaLib = jest.requireActual('../../../../../common/lib/kibana');

  return {
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
      },
    }),
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
    }),
    useNavigateTo: jest.fn().mockReturnValue({
      navigateTo: jest.fn(),
    }),
    useGetUserCasesPermissions: originalKibanaLib.useGetUserCasesPermissions,
  };
});

jest.mock('../../../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(() => false),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

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
  timelineId: TimelineId.test,
  toggleShowNotes: () => {},
};

describe('Actions', () => {
  beforeAll(() => {
    (useShallowEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
  });

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

    test('it should not show session view button on action tabs for basic users', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'] } },
      };

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toEqual(false);
    });

    test('it should show session view button on action tabs when user access the session viewer via K8S dashboard', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'] } },
      };

      const wrapper = mount(
        <TestProviders>
          <Actions
            {...defaultProps}
            ecsData={ecsData}
            timelineId={TableId.kubernetesPageSessions} // not a bug, this needs to be fixed by providing a generic interface for actions registry
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toEqual(true);
    });

    test('it should show session view button on action tabs for enterprise users', () => {
      const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

      licenseServiceMock.isEnterprise.mockReturnValue(true);

      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'] } },
      };

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toEqual(true);
    });
  });

  describe('isAlert', () => {
    test('it returns true when the eventType is an alert', () => {
      expect(isAlert('signal')).toBe(true);
    });

    test('it returns false when the eventType is NOT an alert', () => {
      expect(isAlert('raw')).toBe(false);
    });
  });
});
