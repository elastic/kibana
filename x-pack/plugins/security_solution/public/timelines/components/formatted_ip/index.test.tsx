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
import { TimelineId, TimelineTabs } from '../../../../common/types/timeline';
import { StatefulEventContext } from '../../../common/components/events_viewer/stateful_event_context';
import { NetworkPanelKey } from '../../../flyout/network_details';

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

jest.mock('../../store');

const mockOpenFlyout = jest.fn();
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openFlyout: mockOpenFlyout,
  }),
}));

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

  test('if enableIpDetailsFlyout, should open NetworkDetails expandable flyout', () => {
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
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: NetworkPanelKey,
        params: {
          ip: props.value,
          flowTarget: 'source',
        },
      },
    });
  });
});
