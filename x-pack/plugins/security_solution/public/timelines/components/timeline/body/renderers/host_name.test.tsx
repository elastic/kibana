/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import { HostName } from './host_name';
import { TestProviders } from '../../../../../common/mock';
import { TimelineId, TimelineTabs } from '../../../../../../common/types';
import { timelineActions } from '../../../../store/timeline';

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

describe('HostName', () => {
  const props = {
    fieldName: 'host.name',
    contextId: 'test-context-id',
    eventId: 'test-event-id',
    isDraggable: false,
    value: 'Mock Host',
  };
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });
  test('should render host name', async () => {
    const wrapper = render(
      <TestProviders>
        <HostName {...props} />
      </TestProviders>
    );
    const component = wrapper.getByText(props.value);
    expect(component.textContent).toEqual(props.value);
  });

  test('should render DefaultDraggable if isDraggable is true', () => {
    const testProps = {
      ...props,
      isDraggable: true,
    };
    const wrapper = render(
      <TestProviders>
        <HostName {...testProps} />
      </TestProviders>
    );

    expect(wrapper.getByTestId('DefaultDraggable')).toBeTruthy();
  });

  test('if not enableHostDetailsFlyout, should go to hostdetails page', async () => {
    const wrapper = render(
      <TestProviders>
        <HostName {...props} />
      </TestProviders>
    );

    const button = wrapper.getByTestId('host-details-button');
    act(() => {
      fireEvent.click(button);
    });
    expect(timelineActions.toggleDetailPanel).not.toHaveBeenCalled();
  });

  test('if enableHostDetailsFlyout, should open HostDetailsSidePanel', async () => {
    const newProps = {
      timelineId: TimelineId.active,
      tabType: TimelineTabs.query,
    };
    const wrapper = render(
      <TestProviders>
        <HostName {...props} {...newProps} />
      </TestProviders>
    );

    const button = wrapper.getByTestId('host-details-button');
    act(() => {
      fireEvent.click(button);
    });
    expect(timelineActions.toggleDetailPanel).toHaveBeenCalledWith({
      panelView: 'hostDetail',
      params: {
        hostName: props.value,
      },
      tabType: TimelineTabs.query,
      timelineId: TimelineId.active,
    });
  });

  test('if timelineId not equals to `TimelineId.active`, should call toggleDetailPanel anyway', async () => {
    const newProps = {
      timelineId: 'detection',
      tabType: TimelineTabs.query,
    };
    const wrapper = render(
      <TestProviders>
        <HostName {...props} {...newProps} />
      </TestProviders>
    );

    const button = wrapper.getByTestId('host-details-button');
    act(() => {
      fireEvent.click(button);
    });
    expect(timelineActions.toggleDetailPanel).toHaveBeenCalledWith({
      panelView: 'hostDetail',
      params: {
        hostName: props.value,
      },
      tabType: TimelineTabs.query,
      timelineId: 'detection',
    });
  });
});
