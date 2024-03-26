/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { TestProviders } from '../../../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { timelineActions } from '../../../../store';
import { UserName } from './user_name';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { createTelemetryServiceMock } from '../../../../../common/lib/telemetry/telemetry_service.mock';
import { dataTableActions, TableId } from '@kbn/securitysolution-data-table';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';

const mockedTelemetry = createTelemetryServiceMock();
const mockOpenRightPanel = jest.fn();

jest.mock('../../../../../common/hooks/use_experimental_features');

jest.mock('@kbn/expandable-flyout', () => {
  return {
    useExpandableFlyoutApi: () => ({
      openRightPanel: mockOpenRightPanel,
    }),
    TestProvider: ({ children }: PropsWithChildren<{}>) => <>{children}</>,
  };
});

jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  return {
    ...origin,
    useDispatch: jest.fn().mockReturnValue(jest.fn()),
  };
});

jest.mock('../../../../../common/lib/kibana/kibana_react', () => {
  return {
    useKibana: () => ({
      services: {
        application: {
          getUrlForApp: jest.fn(),
          navigateToApp: jest.fn(),
        },
        telemetry: mockedTelemetry,
      },
    }),
  };
});

jest.mock('../../../../../common/components/draggables', () => ({
  DefaultDraggable: () => <div data-test-subj="DefaultDraggable" />,
}));

jest.mock('../../../../store', () => {
  const original = jest.requireActual('../../../../store');
  return {
    ...original,
    timelineActions: {
      ...original.timelineActions,
      toggleDetailPanel: jest.fn(),
    },
  };
});

jest.mock('@kbn/securitysolution-data-table', () => {
  const original = jest.requireActual('@kbn/securitysolution-data-table');
  return {
    ...original,
    dataTableActions: {
      ...original.dataTableActions,
      toggleDetailPanel: jest.fn(),
    },
  };
});

describe('UserName', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    fieldName: 'user.name',
    fieldType: 'keyword',
    isAggregatable: true,
    contextId: 'test-context-id',
    eventId: 'test-event-id',
    isDraggable: false,
    value: 'Mock User',
  };

  test('should render user name', () => {
    const wrapper = mount(
      <TestProviders>
        <UserName {...props} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="users-link-anchor"]').last().text()).toEqual(props.value);
  });

  test('should render DefaultDraggable if isDraggable is true', () => {
    const testProps = {
      ...props,
      isDraggable: true,
    };
    const wrapper = mount(
      <TestProviders>
        <UserName {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="DefaultDraggable"]').exists()).toEqual(true);
  });

  test('should not open any flyout or panels if context in not defined', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserName {...props} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="users-link-anchor"]').last().simulate('click');
    await waitFor(() => {
      expect(dataTableActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(timelineActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(mockOpenRightPanel).not.toHaveBeenCalled();
    });
  });

  test('should not open any flyout or panels if timelineID is not defined', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: '',
      tabType: TimelineTabs.query,
    };

    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="users-link-anchor"]').last().simulate('click');
    await waitFor(() => {
      expect(dataTableActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(timelineActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(mockOpenRightPanel).not.toHaveBeenCalled();
    });
  });

  test('should open old flyout on table', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
      if (feature === 'newUserDetailsFlyout') return false;
      if (feature === 'expandableTimelineFlyoutEnabled') return false;
    });
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TableId.alertsOnAlertsPage,
      tabType: TimelineTabs.query,
    };
    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="users-link-anchor"]').last().simulate('click');
    await waitFor(() => {
      expect(dataTableActions.toggleDetailPanel).toHaveBeenCalledWith({
        id: context.timelineID,
        panelView: 'userDetail',
        params: {
          userName: props.value,
        },
        tabType: context.tabType,
      });
      expect(timelineActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(mockOpenRightPanel).not.toHaveBeenCalled();
    });
  });

  test('should open old flyout in timeline', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
      if (feature === 'newUserDetailsFlyout') return false;
      if (feature === 'expandableTimelineFlyoutEnabled') return false;
    });
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="users-link-anchor"]').last().simulate('click');
    await waitFor(() => {
      expect(timelineActions.toggleDetailPanel).toHaveBeenCalledWith({
        id: context.timelineID,
        panelView: 'userDetail',
        params: {
          userName: props.value,
        },
        tabType: context.tabType,
      });
      expect(dataTableActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(mockOpenRightPanel).not.toHaveBeenCalled();
    });
  });

  test('should open expandable flyout on table', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
      if (feature === 'newUserDetailsFlyout') return true;
      if (feature === 'expandableTimelineFlyoutEnabled') return false;
    });
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TableId.alertsOnAlertsPage,
      tabType: TimelineTabs.query,
    };
    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="users-link-anchor"]').last().simulate('click');
    await waitFor(() => {
      expect(mockOpenRightPanel).toHaveBeenCalledWith({
        id: 'user-panel',
        params: {
          userName: props.value,
          contextID: props.contextId,
          scopeId: TableId.alertsOnAlertsPage,
          isDraggable: false,
        },
      });
      expect(timelineActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(dataTableActions.toggleDetailPanel).not.toHaveBeenCalled();
    });
  });

  test('should open expandable flyout in timeline', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation((feature: string) => {
      if (feature === 'newUserDetailsFlyout') return true;
      if (feature === 'expandableTimelineFlyoutEnabled') return true;
    });
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    const wrapper = mount(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <UserName {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    wrapper.find('[data-test-subj="users-link-anchor"]').last().simulate('click');
    await waitFor(() => {
      expect(mockOpenRightPanel).toHaveBeenCalledWith({
        id: 'user-panel',
        params: {
          userName: props.value,
          contextID: props.contextId,
          scopeId: TableId.alertsOnAlertsPage,
          isDraggable: false,
        },
      });
      expect(timelineActions.toggleDetailPanel).not.toHaveBeenCalled();
      expect(dataTableActions.toggleDetailPanel).not.toHaveBeenCalled();
    });
  });
});
