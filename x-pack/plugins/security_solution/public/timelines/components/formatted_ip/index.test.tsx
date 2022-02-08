/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react';

import { FormattedIp } from './index';
import { TestProviders } from '../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../common/types';
import { timelineActions } from '../../store/timeline';

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
    isDraggable: false,
    fieldName: 'host.ip',
    timelineId: 'test',
  };

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });
  test('should render ip address', () => {
    const wrapper = render(
      <TestProviders>
        <FormattedIp {...props} />
      </TestProviders>
    );

    expect(wrapper.findByText(props.value)).toBeTruthy();
  });

  test('should render DraggableWrapper if isDraggable is true', async () => {
    const testProps = {
      ...props,
      isDraggable: true,
    };
    const wrapper = render(
      <TestProviders>
        <FormattedIp {...testProps} />
      </TestProviders>
    );
    const draggable = await wrapper.findByTestId('DraggableWrapper');

    expect(draggable).toBeTruthy();
  });

  test('should open NetworkDetailsSidePanel for the active timeline', async () => {
    const newProps = {
      ...props,
      timelineId: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    const wrapper = render(
      <TestProviders>
        <FormattedIp {...newProps} />
      </TestProviders>
    );
    const networkDetail = wrapper.getByTestId('network-details');
    act(() => {
      fireEvent.click(networkDetail, { bubbles: true });
    });

    expect(timelineActions.toggleDetailPanel).toHaveBeenCalledWith({
      panelView: 'networkDetail',
      params: {
        flowTarget: 'source',
        ip: props.value,
      },
      tabType: TimelineTabs.query,
      timelineId: 'timeline-1',
    });
  });

  test('should call toggle detail panel for a test timeline', async () => {
    const newProps = {
      ...props,
      timelineId: TimelineId.test,
      tabType: TimelineTabs.query,
    };
    const wrapper = render(
      <TestProviders>
        <FormattedIp {...newProps} />
      </TestProviders>
    );

    const networkDetail = wrapper.getByTestId('network-details');
    act(() => {
      fireEvent.click(networkDetail);
    });
    expect(timelineActions.toggleDetailPanel).toHaveBeenCalledWith({
      panelView: 'networkDetail',
      params: {
        flowTarget: 'source',
        ip: props.value,
      },
      tabType: TimelineTabs.query,
      timelineId: TimelineId.test,
    });
  });
});
