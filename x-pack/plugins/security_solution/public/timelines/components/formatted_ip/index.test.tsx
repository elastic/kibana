/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormattedIp } from '.';
import { TestProviders } from '../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../common/types';
import { timelineActions } from '../../store/timeline';
import { activeTimeline } from '../../containers/active_timeline_context';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';

jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  return {
    ...origin,
    useDispatch: jest.fn().mockReturnValue(jest.fn()),
  };
});

jest.mock('../../../common/lib/kibana/kibana_react', () => {
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

jest.mock('../../../common/components/drag_and_drop/draggable_wrapper', () => {
  const original = jest.requireActual('../../../common/components/drag_and_drop/draggable_wrapper');
  return {
    ...original,
    DraggableWrapper: () => <div data-test-subj="DraggableWrapper" />,
  };
});

jest.mock('../../store/timeline', () => {
  const original = jest.requireActual('../../store/timeline');
  return {
    ...original,
    timelineActions: {
      ...original.timelineActions,
      toggleDetailPanel: jest.fn(),
    },
  };
});

describe('FormattedIp', () => {
  const props = {
    value: '192.168.1.1',
    contextId: 'test-context-id',
    eventId: 'test-event-id',
    isAggregatable: true,
    fieldType: 'ip',
    isDraggable: false,
    fieldName: 'host.ip',
  };

  let toggleExpandedDetail: jest.SpyInstance;

  beforeAll(() => {
    toggleExpandedDetail = jest.spyOn(activeTimeline, 'toggleExpandedDetail');
  });

  afterEach(() => {
    toggleExpandedDetail.mockClear();
  });
  test('should render ip address', () => {
    render(
      <TestProviders>
        <FormattedIp {...props} />
      </TestProviders>
    );

    expect(screen.getByText(props.value)).toBeInTheDocument();
  });

  test('should render DraggableWrapper if isDraggable is true', () => {
    const testProps = {
      ...props,
      isDraggable: true,
    };
    render(
      <TestProviders>
        <FormattedIp {...testProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('DraggableWrapper')).toBeInTheDocument();
  });

  test('if not enableIpDetailsFlyout, should go to network details page', () => {
    render(
      <TestProviders>
        <FormattedIp {...props} />
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('network-details'));
    expect(timelineActions.toggleDetailPanel).not.toHaveBeenCalled();
    expect(toggleExpandedDetail).not.toHaveBeenCalled();
  });

  test('if enableIpDetailsFlyout, should open NetworkDetailsSidePanel', () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    render(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <FormattedIp {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('network-details'));
    expect(timelineActions.toggleDetailPanel).toHaveBeenCalledWith({
      id: context.timelineID,
      panelView: 'networkDetail',
      params: {
        flowTarget: 'source',
        ip: props.value,
      },
      tabType: context.tabType,
    });
  });

  test('if enableIpDetailsFlyout and timelineId equals to `timeline-1`, should call toggleExpandedDetail', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    render(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <FormattedIp {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('network-details'));
    expect(toggleExpandedDetail).toHaveBeenCalledWith({
      panelView: 'networkDetail',
      params: {
        flowTarget: 'source',
        ip: props.value,
      },
    });
  });

  test('if enableIpDetailsFlyout but timelineId not equals to `TimelineId.active`, should not call toggleExpandedDetail', async () => {
    const context = {
      enableHostDetailsFlyout: true,
      enableIpDetailsFlyout: true,
      timelineID: TimelineId.test,
      tabType: TimelineTabs.query,
    };
    render(
      <TestProviders>
        <StatefulEventContext.Provider value={context}>
          <FormattedIp {...props} />
        </StatefulEventContext.Provider>
      </TestProviders>
    );

    userEvent.click(screen.getByTestId('network-details'));
    expect(timelineActions.toggleDetailPanel).toHaveBeenCalledWith({
      id: context.timelineID,
      panelView: 'networkDetail',
      params: {
        flowTarget: 'source',
        ip: props.value,
      },
      tabType: context.tabType,
    });
    expect(toggleExpandedDetail).not.toHaveBeenCalled();
  });
});
