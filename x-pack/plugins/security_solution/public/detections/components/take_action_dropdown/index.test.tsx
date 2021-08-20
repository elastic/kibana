/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactElement } from 'react';
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
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';

jest.mock('../../../common/hooks/endpoint/use_isolate_privileges', () => ({
  useIsolationPrivileges: jest.fn().mockReturnValue({ isAllowed: true }),
}));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useGetUserCasesPermissions: jest.fn().mockReturnValue({ crud: true }),
}));
jest.mock('../../../cases/components/use_insert_timeline');

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));
jest.mock('@kbn/alerts', () => {
  return { useGetUserAlertsPermissions: jest.fn().mockReturnValue({ crud: true }) };
});

jest.mock('../../../common/utils/endpoint_alert_check', () => {
  return { endpointAlertCheck: jest.fn().mockReturnValue(true) };
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

interface Panel extends EuiContextMenuPanelDescriptor {
  content: ReactElement<Panel>;
  items: EuiContextMenuPanelItemDescriptor[];
}

interface CaseActionPanel extends EuiContextMenuPanelDescriptor {
  content: Array<ReactElement<CaseActionPanel>>;
  children: ReactElement;
}

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

    test('should render "Change alert status"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[0].items[0].name
        ).toEqual('Change alert status');
      });
    });

    test('should render "Add Endpoint exception"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[0].items[1].name
        ).toEqual('Add Endpoint exception');
      });
    });
    test('should render "Add rule exception"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[0].items[2].name
        ).toEqual('Add rule exception');
      });
    });
    test('should render "Add to case"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[0].items[3].name
        ).toEqual('Add to case');
      });
    });
    test('should render "Isolate host"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[0].items[4].name
        ).toEqual('Isolate host');
      });
    });
    test('should render "Investigate in timeline"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[0].items[5].name
        ).toEqual('Investigate in timeline');
      });
    });
  });

  describe('should render nested menu items', () => {
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

    test('should render "Change alert status" title', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[1].title
        ).toEqual('Change alert status');
      });
    });

    test('should render "mark as acknowledge"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[1].content?.props.items[0].key
        ).toEqual('acknowledge');
      });
    });

    test('should render "mark as close"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[1].content?.props.items[1].key
        ).toEqual('close');
      });
    });

    test('should render "Add to case" title', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<Panel[]>('panels')[2].title
        ).toEqual('Add to case');
      });
    });

    test('should render "Add to existing case"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<CaseActionPanel[]>('panels')[2].content[0].props.children
        ).toEqual('Add to existing case');
      });
    });

    test('should render "Add to new case"', async () => {
      await waitFor(() => {
        expect(
          wrapper
            .find('EuiContextMenu[data-test-subj="takeActionPanelMenu"]')
            .prop<CaseActionPanel[]>('panels')[2].content[1].props.children
        ).toEqual('Add to new case');
      });
    });
  });
});
