/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import type { TakeActionDropdownProps } from '.';
import { TakeActionDropdown } from '.';
import { generateAlertDetailsDataMock } from '../../../common/components/event_details/__mocks__';
import { getDetectionAlertMock } from '../../../common/mock/mock_detection_alerts';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { TimelineId } from '../../../../common/types/timeline';
import { TestProviders } from '../../../common/mock';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { useHttp, useKibana } from '../../../common/lib/kibana';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { initialUserPrivilegesState as mockInitialUserPrivilegesState } from '../../../common/components/user_privileges/user_privileges_context';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
} from '../endpoint_responder/translations';
import { endpointMetadataHttpMocks } from '../../../management/pages/endpoint_hosts/mocks';
import type { HttpSetup } from '@kbn/core/public';
import {
  isAlertFromEndpointAlert,
  isAlertFromEndpointEvent,
} from '../../../common/utils/endpoint_alert_check';
import { getUserPrivilegesMockDefaultValue } from '../../../common/components/user_privileges/__mocks__';
import { allCasesPermissions } from '../../../cases_test_utils';
import { HostStatus } from '../../../../common/endpoint/types';
import { ENDPOINT_CAPABILITIES } from '../../../../common/endpoint/service/response_actions/constants';
import {
  ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE,
  ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
} from '../../../common/components/toolbar/bulk_actions/translations';

jest.mock('../../../common/components/user_privileges');

jest.mock('../user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/guided_onboarding_tour/tour_step');

jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
}));
jest.mock('../../../cases/components/use_insert_timeline');

jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
  }),
}));

jest.mock('../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({ isPlatinumPlus: () => true, isEnterprise: () => false }),
}));

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../common/utils/endpoint_alert_check', () => {
  const realEndpointAlertCheckUtils = jest.requireActual(
    '../../../common/utils/endpoint_alert_check'
  );
  return {
    isTimelineEventItemAnAlert: realEndpointAlertCheckUtils.isTimelineEventItemAnAlert,
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
    useEndpointHostIsolationStatus: jest.fn().mockReturnValue({
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
      detailsData: generateAlertDetailsDataMock() as TimelineEventsDetailsItem[],
      ecsData: getDetectionAlertMock(),
      handleOnEventClosed: jest.fn(),
      isHostIsolationPanelOpen: false,
      loadingEventDetails: false,
      onAddEventFilterClick: jest.fn(),
      onAddExceptionTypeClick: jest.fn(),
      onAddIsolationStatusClick: jest.fn(),
      refetch: jest.fn(),
      refetchFlyoutData: jest.fn(),
      scopeId: TimelineId.active,
      onOsqueryClick: jest.fn(),
    };

    mockStartServicesMock = createStartServicesMock();

    (useKibana as jest.Mock).mockImplementation(() => {
      return {
        services: {
          ...mockStartServicesMock,
          timelines: { ...mockTimelines },
          cases: {
            ...mockCasesContract(),
            helpers: {
              canUseCases: jest.fn().mockReturnValue(allCasesPermissions()),
              getRuleIdFromEvent: () => null,
            },
          },
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

  afterEach(() => {
    (useUserPrivileges as jest.Mock).mockReturnValue(getUserPrivilegesMockDefaultValue());
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
    test('should render "Respond"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="endpointResponseActions-action-item"]').first().text()
        ).toEqual('Respond');
      });
    });
    test('should render "Apply alert tags"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="alert-tags-context-menu-item"]').first().text()
        ).toEqual(ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE);
      });
    });
    test('should render "Assign alert"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="alert-assignees-context-menu-item"]').first().text()
        ).toEqual(ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE);
      });
    });
  });

  describe('for Endpoint related actions', () => {
    /** Removes the detail data that is used to determine if data is for an Alert */
    const setAlertDetailsDataMockToEvent = () => {
      if (defaultProps.detailsData) {
        defaultProps.detailsData = defaultProps.detailsData
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
      } else {
        expect(defaultProps.detailsData).toBeInstanceOf(Object);
      }
    };

    const setAlertDetailsDataMockToEndpointAgent = () => {
      if (defaultProps.detailsData) {
        defaultProps.detailsData = defaultProps.detailsData.map((obj) => {
          if (obj.field === 'agent.type') {
            return {
              category: 'agent',
              field: 'agent.type',
              values: ['endpoint'],
              originalValue: ['endpoint'],
            };
          }
          if (obj.field === 'agent.id') {
            return {
              category: 'agent',
              field: 'agent.id',
              values: ['123'],
              originalValue: ['123'],
            };
          }

          return obj;
        }) as TimelineEventsDetailsItem[];
      } else {
        expect(defaultProps.detailsData).toBeInstanceOf(Object);
      }
    };

    /** Set the `agent.type` and `agent.id` on the EcsData */
    const setTypeOnEcsDataWithAgentType = (
      agentType: string = 'endpoint',
      agentId: string = '123'
    ) => {
      if (defaultProps.ecsData) {
        defaultProps.ecsData.agent = {
          // @ts-expect-error Ecs definition for agent seems to be missing properties
          id: agentId,
          type: [agentType],
        };
      } else {
        expect(defaultProps.ecsData).toBeInstanceOf(Object);
      }
    };

    describe('should correctly enable/disable the "Add Endpoint event filter" button', () => {
      let wrapper: ReactWrapper;

      beforeEach(() => {
        setTypeOnEcsDataWithAgentType();
        setAlertDetailsDataMockToEvent();
      });

      test('should enable the "Add Endpoint event filter" button if provided endpoint event and has right privileges', async () => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canWriteEventFilters: true },
        });
        wrapper = mount(
          <TestProviders>
            <TakeActionDropdown {...defaultProps} />
          </TestProviders>
        );
        wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');
        await waitFor(() => {
          expect(
            wrapper.find('[data-test-subj="add-event-filter-menu-item"]').last().getDOMNode()
          ).toBeEnabled();
        });
      });

      test('should hide the "Add Endpoint event filter" button if no write event filters privileges', async () => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canWriteEventFilters: false },
        });
        wrapper = mount(
          <TestProviders>
            <TakeActionDropdown {...defaultProps} />
          </TestProviders>
        );
        wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');
        await waitFor(() => {
          expect(wrapper.exists('[data-test-subj="add-event-filter-menu-item"]')).toBeFalsy();
        });
      });

      test('should hide the "Add Endpoint event filter" button if provided no event from endpoint', async () => {
        setTypeOnEcsDataWithAgentType('filebeat');

        wrapper = mount(
          <TestProviders>
            <TakeActionDropdown {...defaultProps} />
          </TestProviders>
        );
        wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');
        await waitFor(() => {
          expect(wrapper.exists('[data-test-subj="add-event-filter-menu-item"]')).toBeFalsy();
        });
      });
    });

    describe('should correctly enable/disable the "Isolate Host" button', () => {
      let wrapper: ReactWrapper;

      const render = (): ReactWrapper => {
        wrapper = mount(
          <TestProviders>
            <TakeActionDropdown {...defaultProps} />
          </TestProviders>
        );
        wrapper.find('button[data-test-subj="take-action-dropdown-btn"]').simulate('click');

        return wrapper;
      };

      const isolateHostButtonExists = (): ReturnType<typeof wrapper.exists> => {
        return wrapper.exists('[data-test-subj="isolate-host-action-item"]');
      };

      beforeEach(() => {
        setTypeOnEcsDataWithAgentType();
      });

      it('should show Isolate host button if user has "Host isolation" privileges set to all', async () => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canIsolateHost: true },
        });
        render();

        await waitFor(() => {
          expect(isolateHostButtonExists()).toBeTruthy();
        });
      });
      it('should hide Isolate host button if user has "Host isolation" privileges set to none', () => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canIsolateHost: false },
        });
        render();

        expect(isolateHostButtonExists()).toBeFalsy();
      });
    });

    describe('should correctly enable/disable the "Respond" button', () => {
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

      beforeAll(() => {
        // Un-Mock endpoint alert check hooks
        const actualChecks = jest.requireActual('../../../common/utils/endpoint_alert_check');
        (isAlertFromEndpointEvent as jest.Mock).mockImplementation(
          actualChecks.isAlertFromEndpointEvent
        );
        (isAlertFromEndpointAlert as jest.Mock).mockImplementation(
          actualChecks.isAlertFromEndpointAlert
        );
      });

      afterAll(() => {
        // Set the mock modules back to what they were
        (isAlertFromEndpointEvent as jest.Mock).mockImplementation(() => true);
        (isAlertFromEndpointAlert as jest.Mock).mockImplementation(() => true);
      });

      beforeEach(() => {
        setTypeOnEcsDataWithAgentType();
        apiMocks = endpointMetadataHttpMocks(mockStartServicesMock.http as jest.Mocked<HttpSetup>);
      });

      it('should not display the button if user is not allowed to write event filters', async () => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canWriteEventFilters: false },
        });
        render();

        expect(findLaunchResponderButton()).toHaveLength(0);
      });

      it('should not display the button for Events', async () => {
        setAlertDetailsDataMockToEvent();
        render();

        expect(findLaunchResponderButton()).toHaveLength(0);
      });

      it('should enable button for non endpoint event type when defend integration present', async () => {
        setTypeOnEcsDataWithAgentType('filebeat');
        if (defaultProps.detailsData) {
          defaultProps.detailsData = generateAlertDetailsDataMock() as TimelineEventsDetailsItem[];
        }
        render();

        expect(findLaunchResponderButton().first().prop('disabled')).toBe(true);
        expect(findLaunchResponderButton().first().prop('toolTipContent')).toEqual(
          LOADING_ENDPOINT_DATA_TOOLTIP
        );

        await waitFor(() => {
          expect(apiMocks.responseProvider.metadataDetails).toHaveBeenCalled();
          wrapper.update();

          expect(findLaunchResponderButton().first().prop('disabled')).toBe(false);
          expect(findLaunchResponderButton().first().prop('toolTipContent')).toEqual(undefined);
        });
      });

      it('should disable the button for non endpoint event type when defend integration not present', async () => {
        setAlertDetailsDataMockToEndpointAgent();
        apiMocks.responseProvider.metadataDetails.mockImplementation(() => {
          const error: Error & { body?: { statusCode: number } } = new Error();
          error.body = { statusCode: 404 };
          throw error;
        });
        render();

        await waitFor(() => {
          expect(apiMocks.responseProvider.metadataDetails).toThrow();
          wrapper.update();

          expect(findLaunchResponderButton().first().prop('disabled')).toBe(true);
          expect(findLaunchResponderButton().first().prop('toolTipContent')).toEqual(
            NOT_FROM_ENDPOINT_HOST_TOOLTIP
          );
        });
      });

      it('should disable the button if host status is unenrolled', async () => {
        setAlertDetailsDataMockToEndpointAgent();
        const getApiResponse = apiMocks.responseProvider.metadataDetails.getMockImplementation();
        apiMocks.responseProvider.metadataDetails.mockImplementation(() => {
          if (getApiResponse) {
            return {
              ...getApiResponse(),
              metadata: {
                ...getApiResponse().metadata,
                Endpoint: {
                  ...getApiResponse().metadata.Endpoint,
                  capabilities: [...ENDPOINT_CAPABILITIES],
                },
              },
              host_status: HostStatus.UNENROLLED,
            };
          }
          throw new Error('some error');
        });
        render();

        await waitFor(() => {
          expect(apiMocks.responseProvider.metadataDetails).toHaveBeenCalled();
          wrapper.update();

          expect(findLaunchResponderButton().first().prop('disabled')).toBe(true);
          expect(findLaunchResponderButton().first().prop('toolTipContent')).toEqual(
            HOST_ENDPOINT_UNENROLLED_TOOLTIP
          );
        });
      });
    });
  });
});
