/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act, waitFor } from '@testing-library/react';

import { TakeActionDropdown, TakeActionDropdownProps } from '.';
import { mockAlertDetailsData } from '../../../common/components/event_details/__mocks__';
import { mockEcsDataWithAlert } from '../../../common/mock/mock_detection_alerts';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { TimelineId } from '../../../../common/types';
import { TestProviders } from '../../../common/mock';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { useKibana, useGetUserCasesPermissions, useHttp } from '../../../common/lib/kibana';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { initialUserPrivilegesState as mockInitialUserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { cloneDeep } from 'lodash';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { NOT_FROM_ENDPOINT_HOST_TOOLTIP } from '../response_actions_console/response_actions_console_context_menu_item';
import { endpointMetadataHttpMocks } from '../../../management/pages/endpoint_hosts/mocks';
import { HttpSetup } from '@kbn/core/public';

jest.mock('../../../common/components/user_privileges');

jest.mock('../user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));

jest.mock('../../../common/lib/kibana');
(useGetUserCasesPermissions as jest.Mock).mockReturnValue({ crud: true });

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
  let defaultProps: TakeActionDropdownProps;
  let mockStartServicesMock: ReturnType<typeof createStartServicesMock>;

  beforeEach(() => {
    defaultProps = {
      detailsData: mockAlertDetailsData as TimelineEventsDetailsItem[],
      ecsData: cloneDeep(mockEcsDataWithAlert),
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

    mockStartServicesMock = createStartServicesMock();

    (useKibana as jest.Mock).mockImplementation(() => {
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

    (useHttp as jest.Mock).mockReturnValue(mockStartServicesMock.http);
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
    let wrapper: ReactWrapper;

    beforeAll(() => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
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
    test('should render "Launch responder"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="endpointResponseActions-action-item"]').first().text()
        ).toEqual('Launch responder');
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

  describe('should correctly enable/disable the "Launch responder" button', () => {
    let wrapper: ReactWrapper;
    let apiMocks: ReturnType<typeof endpointMetadataHttpMocks>;

    const render = (): ReactWrapper => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );
      wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');

      return wrapper;
    };

    const findLaunchResponderButton = (): ReturnType<typeof wrapper.find> => {
      return wrapper.find('[data-test-subj="endpointResponseActions-action-item"]');
    };

    beforeEach(() => {
      apiMocks = endpointMetadataHttpMocks(mockStartServicesMock.http as jest.Mocked<HttpSetup>);
    });

    describe('when the `responseActionsConsoleEnabled` feature flag is false', () => {
      beforeAll(() => {
        (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((featureKey) => {
          if (featureKey === 'responseActionsConsoleEnabled') {
            return false;
          }
          return true;
        });
      });

      afterAll(() => {
        (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(() => true);
      });

      it('should hide the button if feature flag if off', async () => {
        render();

        expect(findLaunchResponderButton()).toHaveLength(0);
      });
    });

    it('should disable the button if alert NOT from a host running endpoint', async () => {
      if (defaultProps.ecsData) {
        defaultProps.ecsData.agent = {
          // @ts-expect-error Ecs definition for agent seems to be missing properties
          id: '123',
          type: ['some-agent'],
        };
      }
      render();

      await act(async () => {
        await waitFor(() => {
          expect(apiMocks.responseProvider.metadataDetails).toHaveBeenCalled();
        });
      });

      expect(findLaunchResponderButton().first().prop('disabled')).toBe(true);
      expect(findLaunchResponderButton().first().prop('toolTipContent')).toEqual(
        NOT_FROM_ENDPOINT_HOST_TOOLTIP
      );
    });

    it.todo('should disable the button if host is no longer running endpoint');
  });
});
