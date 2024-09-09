/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { TestProviders } from '../../../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { UserName } from './user_name';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { createTelemetryServiceMock } from '../../../../../common/lib/telemetry/telemetry_service.mock';
import { TableId } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { createExpandableFlyoutApiMock } from '../../../../../common/mock/expandable_flyout';

const mockedTelemetry = createTelemetryServiceMock();
const mockOpenRightPanel = jest.fn();

jest.mock('@kbn/expandable-flyout');

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

describe('UserName', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openRightPanel: mockOpenRightPanel,
    });
  });
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
      expect(mockOpenRightPanel).not.toHaveBeenCalled();
    });
  });

  test('should open expandable flyout on table', async () => {
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
    });
  });

  test('should open expandable flyout in timeline', async () => {
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
          scopeId: 'timeline-1',
          isDraggable: false,
        },
      });
    });
  });
});
