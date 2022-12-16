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
import { TimelineId, TimelineTabs } from '../../../../../../common/types';
import { timelineActions } from '../../../../store/timeline';
import { activeTimeline } from '../../../../containers/active_timeline_context';
import { UserName } from './user_name';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';

jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  return {
    ...origin,
    useDispatch: jest.fn().mockReturnValue(jest.fn()),
  };
});

jest.mock('../../../../../common/lib/kibana/kibana_react', () => {
  return {
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          getUrlForApp: jest.fn(),
          navigateToApp: jest.fn(),
        },
      },
    }),
  };
});

jest.mock('../../../../../common/components/draggables', () => ({
  DefaultDraggable: () => <div data-test-subj="DefaultDraggable" />,
}));

jest.mock('../../../../store/timeline', () => {
  const original = jest.requireActual('../../../../store/timeline');
  return {
    ...original,
    timelineActions: {
      ...original.timelineActions,
      toggleDetailPanel: jest.fn(),
    },
  };
});

describe('UserName', () => {
  const props = {
    fieldName: 'user.name',
    fieldType: 'keyword',
    isAggregatable: true,
    contextId: 'test-context-id',
    eventId: 'test-event-id',
    isDraggable: false,
    value: 'Mock User',
  };

  let toggleExpandedDetail: jest.SpyInstance;

  beforeAll(() => {
    toggleExpandedDetail = jest.spyOn(activeTimeline, 'toggleExpandedDetail');
  });

  afterEach(() => {
    toggleExpandedDetail.mockClear();
  });
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

  test('if timelineId equals to `timeline-1`, should call toggleExpandedDetail', async () => {
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
      expect(toggleExpandedDetail).toHaveBeenCalledWith({
        panelView: 'userDetail',
        params: {
          userName: props.value,
        },
      });
    });
  });

  test('if timelineId not equals to `TimelineId.active`, should not call toggleExpandedDetail', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.test,
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
      expect(toggleExpandedDetail).not.toHaveBeenCalled();
    });
  });
});
