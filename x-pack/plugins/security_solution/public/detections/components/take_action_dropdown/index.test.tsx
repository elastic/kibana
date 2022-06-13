/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { TakeActionDropdown, TakeActionDropdownProps } from '.';
import { mockAlertDetailsData } from '../../../common/components/event_details/__mocks__';
import { mockEcsDataWithAlert } from '../../../common/mock/mock_detection_alerts';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { TimelineId } from '../../../../common/types';
import { TestProviders } from '../../../common/mock';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { useKibana } from '../../../common/lib/kibana';
import { mockCasesContract } from '../../../../../cases/public/mocks';
import { initialUserPrivilegesState as mockInitialUserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';
import { useUserPrivileges } from '../../../common/components/user_privileges';

jest.mock('../../../common/components/user_privileges');

jest.mock('../user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useGetUserCasesPermissions: jest.fn().mockReturnValue({ crud: true }),
}));
jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
}));
jest.mock('../../../cases/components/use_insert_timeline');

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
  }),
}));

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../common/utils/endpoint_alert_check', () => {
  return {
    isAlertFromEndpointAlert: jest.fn().mockReturnValue(true),
    isAlertFromEndpointEvent: jest.fn().mockReturnValue(true),
  };
});

jest.mock('../../../../common/endpoint/service/host_isolation/utils', () => {
  return {
    isIsolationSupported: jest.fn().mockReturnValue(true),
  };
});

jest.mock('../../containers/detection_engine/alerts/use_host_isolation_status', () => {
  return {
    useHostIsolationStatus: jest.fn().mockReturnValue({
      loading: false,
      isIsolated: false,
      agentStatus: 'healthy',
    }),
  };
});

jest.mock('../../../common/components/user_privileges');

describe('take action dropdown', () => {
  const defaultProps: TakeActionDropdownProps = {
    detailsData: mockAlertDetailsData as TimelineEventsDetailsItem[],
    ecsData: mockEcsDataWithAlert,
    handleOnEventClosed: jest.fn(),
    indexName: 'index',
    isHostIsolationPanelOpen: false,
    loadingEventDetails: false,
    onAddEventFilterClick: jest.fn(),
    onAddExceptionTypeClick: jest.fn(),
    onAddIsolationStatusClick: jest.fn(),
    refetch: jest.fn(),
    refetchFlyoutData: jest.fn(),
    timelineId: TimelineId.active,
    onOsqueryClick: jest.fn(),
  };

  beforeAll(() => {
    (useKibana as jest.Mock).mockImplementation(() => {
      const mockStartServicesMock = createStartServicesMock();

      return {
        services: {
          ...mockStartServicesMock,
          timelines: { ...mockTimelines },
          cases: mockCasesContract(),
          osquery: {
            isOsqueryAvailable: jest.fn().mockReturnValue(true),
          },
          application: {
            capabilities: { siem: { crud_alerts: true, read_alerts: true }, osquery: true },
          },
        },
      };
    });
  });

  test('should render takeActionButton', () => {
    const wrapper = mount(
      <TestProviders>
        <TakeActionDropdown {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="take-action-dropdown-btn"]').exists()).toBeTruthy();
  });

  test('should render takeActionButton with correct text', () => {
    const wrapper = mount(
      <TestProviders>
        <TakeActionDropdown {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="take-action-dropdown-btn"]').first().text()).toEqual(
      'Take action'
    );
  });

  describe('should render take action items', () => {
    const testProps = {
      ...defaultProps,
    };
    let wrapper: ReactWrapper;
    beforeAll(() => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...testProps} />
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');
    });
    test('should render "Add to existing case"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="add-to-existing-case-action"]').first().text()
        ).toEqual('Add to existing case');
      });
    });
    test('should render "Add to new case"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="add-to-new-case-action"]').first().text()).toEqual(
          'Add to new case'
        );
      });
    });

    test('should render "mark as acknowledge"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="acknowledged-alert-status"]').first().text()).toEqual(
          'Mark as acknowledged'
        );
      });
    });

    test('should render "mark as close"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="close-alert-status"]').first().text()).toEqual(
          'Mark as closed'
        );
      });
    });

    test('should render "Add Endpoint exception"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="add-endpoint-exception-menu-item"]').first().text()
        ).toEqual('Add Endpoint exception');
      });
    });
    test('should render "Add rule exception"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="add-exception-menu-item"]').first().text()).toEqual(
          'Add rule exception'
        );
      });
    });

    test('should render "Isolate host"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="isolate-host-action-item"]').first().text()).toEqual(
          'Isolate host'
        );
      });
    });
    test('should render "Investigate in timeline"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="investigate-in-timeline-action-item"]').first().text()
        ).toEqual('Investigate in timeline');
      });
    });
    test('should render "Run Osquery"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="osquery-action-item"]').first().text()).toEqual(
          'Run Osquery'
        );
      });
    });
  });

  describe('should correctly enable/disable the "Add Endpoint event filter" button', () => {
    let wrapper: ReactWrapper;

    const getEcsDataWithAgentType = (agentType: string) => ({
      ...mockEcsDataWithAlert,
      agent: {
        type: [agentType],
      },
    });

    const modifiedMockDetailsData = mockAlertDetailsData
      .map((obj) => {
        if (obj.field === 'kibana.alert.rule.uuid') {
          return null;
        }
        if (obj.field === 'event.kind') {
          return {
            category: 'event',
            field: 'event.kind',
            values: ['event'],
            originalValue: 'event',
          };
        }
        return obj;
      })
      .filter((obj) => obj) as TimelineEventsDetailsItem[];

    test('should enable the "Add Endpoint event filter" button if provided endpoint event', async () => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown
            {...defaultProps}
            detailsData={modifiedMockDetailsData}
            ecsData={getEcsDataWithAgentType('endpoint')}
          />
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="add-event-filter-menu-item"]').first().getDOMNode()
        ).toBeEnabled();
      });
    });

    test('should disable the "Add Endpoint event filter" button if no endpoint management privileges', async () => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: { loading: false, canAccessEndpointManagement: false },
      });
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown
            {...defaultProps}
            detailsData={modifiedMockDetailsData}
            ecsData={getEcsDataWithAgentType('endpoint')}
          />
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="add-event-filter-menu-item"]').first().getDOMNode()
        ).toBeDisabled();
      });
    });

    test('should hide the "Add Endpoint event filter" button if provided no event from endpoint', async () => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown
            {...defaultProps}
            detailsData={modifiedMockDetailsData}
            ecsData={getEcsDataWithAgentType('filesbeat')}
          />
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');
      await waitFor(() => {
        expect(wrapper.exists('[data-test-subj="add-event-filter-menu-item"]')).toBeFalsy();
      });
    });
  });
});
