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
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { TakeActionDropdownProps } from './take_action_dropdown';
import { TakeActionDropdown } from './take_action_dropdown';
import { generateAlertDetailsDataMock } from '../../../../common/components/event_details/__mocks__';
import { getDetectionAlertMock } from '../../../../common/mock/mock_detection_alerts';
import { TimelineId } from '../../../../../common/types/timeline';
import { TestProviders } from '../../../../common/mock';
import { mockTimelines } from '../../../../common/mock/mock_timelines_plugin';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { useHttp, useKibana } from '../../../../common/lib/kibana';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { initialUserPrivilegesState as mockInitialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { allCasesPermissions } from '../../../../cases_test_utils';
import {
  ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE,
  ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
} from '../../../../common/components/toolbar/bulk_actions/translations';
import { FLYOUT_FOOTER_DEOPDOEN_BUTTON_TEST_ID } from '../test_ids';

jest.mock('../../../../common/components/endpoint/host_isolation');
jest.mock('../../../../common/components/endpoint/responder');
jest.mock('../../../../common/components/user_privileges');

jest.mock('../../../../detections/components/user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/components/guided_onboarding_tour/tour_step');

jest.mock(
  '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges',
  () => ({
    useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
  })
);
jest.mock('../../../../cases/components/use_insert_timeline');

jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
  }),
}));

jest.mock('../../../../common/hooks/use_license', () => ({
  useLicense: jest.fn().mockReturnValue({ isPlatinumPlus: () => true, isEnterprise: () => false }),
}));

jest.mock(
  '../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_status',
  () => {
    return {
      useEndpointHostIsolationStatus: jest.fn().mockReturnValue({
        loading: false,
        isIsolated: false,
        agentStatus: 'healthy',
      }),
    };
  }
);

describe('take action dropdown', () => {
  let defaultProps: TakeActionDropdownProps;
  let mockStartServicesMock: ReturnType<typeof createStartServicesMock>;

  beforeEach(() => {
    defaultProps = {
      dataFormattedForFieldBrowser: generateAlertDetailsDataMock() as TimelineEventsDetailsItem[],
      dataAsNestedObject: getDetectionAlertMock(),
      handleOnEventClosed: jest.fn(),
      isHostIsolationPanelOpen: false,
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
    expect(
      wrapper.find(`[data-test-subj="${FLYOUT_FOOTER_DEOPDOEN_BUTTON_TEST_ID}"]`).exists()
    ).toBeTruthy();
  });

  test('should render takeActionButton with correct text', () => {
    const wrapper = mount(
      <TestProviders>
        <TakeActionDropdown {...defaultProps} />
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="${FLYOUT_FOOTER_DEOPDOEN_BUTTON_TEST_ID}"]`).first().text()
    ).toEqual('Take action');
  });

  describe('should render take action items', () => {
    let wrapper: ReactWrapper;

    beforeAll(() => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );
      wrapper
        .find(`button[data-test-subj="${FLYOUT_FOOTER_DEOPDOEN_BUTTON_TEST_ID}"]`)
        .simulate('click');
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
      if (defaultProps.dataFormattedForFieldBrowser) {
        defaultProps.dataFormattedForFieldBrowser = defaultProps.dataFormattedForFieldBrowser
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
        expect(defaultProps.dataFormattedForFieldBrowser).toBeInstanceOf(Object);
      }
    };

    const setAgentTypeOnAlertDetailsDataMock = (agentType: string = 'endpoint') => {
      if (defaultProps.dataFormattedForFieldBrowser) {
        defaultProps.dataFormattedForFieldBrowser = defaultProps.dataFormattedForFieldBrowser.map(
          (obj) => {
            if (obj.field === 'agent.type') {
              return {
                category: 'agent',
                field: 'agent.type',
                values: [agentType],
                originalValue: [agentType],
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
          }
        ) as TimelineEventsDetailsItem[];
      } else {
        expect(defaultProps.dataFormattedForFieldBrowser).toBeInstanceOf(Object);
      }
    };

    /** Set the `agent.type` and `agent.id` on the EcsData */
    const setTypeOnEcsDataWithAgentType = (
      agentType: string = 'endpoint',
      agentId: string = '123'
    ) => {
      if (defaultProps.dataAsNestedObject) {
        defaultProps.dataAsNestedObject.agent = {
          // @ts-expect-error Ecs definition for agent seems to be missing properties
          id: agentId,
          type: [agentType],
        };
      } else {
        expect(defaultProps.dataAsNestedObject).toBeInstanceOf(Object);
      }
    };

    let wrapper: ReactWrapper;

    const render = (): ReactWrapper => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );
      wrapper
        .find(`button[data-test-subj="${FLYOUT_FOOTER_DEOPDOEN_BUTTON_TEST_ID}"]`)
        .simulate('click');

      return wrapper;
    };

    it('should include the Isolate/Release action', () => {
      render();

      expect(wrapper.exists('[data-test-subj="isolate-host-action-item"]')).toBe(true);
    });

    it('should include the Responder action', () => {
      render();

      expect(wrapper.exists('[data-test-subj="endpointResponseActions-action-item"]')).toBe(true);
    });

    describe('should correctly enable/disable the "Add Endpoint event filter" button', () => {
      beforeEach(() => {
        setTypeOnEcsDataWithAgentType();
        setAlertDetailsDataMockToEvent();
      });

      test('should enable the "Add Endpoint event filter" button if provided endpoint event and has right privileges', async () => {
        (useUserPrivileges as jest.Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canWriteEventFilters: true },
        });
        render();
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
        render();
        await waitFor(() => {
          expect(wrapper.exists('[data-test-subj="add-event-filter-menu-item"]')).toBeFalsy();
        });
      });

      test('should hide the "Add Endpoint event filter" button if provided no event from endpoint', async () => {
        setAgentTypeOnAlertDetailsDataMock('filebeat');
        setTypeOnEcsDataWithAgentType('filebeat');
        render();
        await waitFor(() => {
          expect(wrapper.exists('[data-test-subj="add-event-filter-menu-item"]')).toBeFalsy();
        });
      });
    });
  });
});
