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
import { TimelineEventsDetailsItem, TimelineId } from '../../../../common';
import { TestProviders } from '../../../common/mock';
import { mockTimelines } from '../../../common/mock/mock_timelines_plugin';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/hooks/endpoint/use_isolate_privileges', () => ({
  useIsolationPrivileges: jest.fn().mockReturnValue({ isAllowed: true }),
}));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useGetUserCasesPermissions: jest.fn().mockReturnValue({ crud: true }),
}));
jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn().mockReturnValue({ hasIndexWrite: true, hasKibanaCRUD: true }),
}));
jest.mock('../../../cases/components/use_insert_timeline');

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
    timelineId: TimelineId.active,
  };

  beforeAll(() => {
    (useKibana as jest.Mock).mockImplementation(() => {
      const mockStartServicesMock = createStartServicesMock();

      return {
        services: {
          ...mockStartServicesMock,
          timelines: { ...mockTimelines },
          application: {
            capabilities: { siem: { crud_alerts: true, read_alerts: true } },
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
  });
});
