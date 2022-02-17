/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { useKibana } from '../../../../common/lib/kibana';
import { EventDetailsFlyoutBody, IFlyoutBodyProps } from '.';
import { TestProviders } from '../../../../common/mock';
import { ACTIVE_PANEL } from '../event_details';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('.../../../../common/hooks/use_app_toasts');

describe('Flyout body', () => {
  let wrapper: ReactWrapper;
  const addErrorMock = jest.fn();
  const addSuccessMock = jest.fn();
  const addWarningMock = jest.fn();

  const defaultProps: IFlyoutBodyProps = {
    browserFields: {},
    detailsData: [
      {
        category: 'agent',
        field: 'agent.id',
        values: ['2132131'],
        originalValue: '2132131',
        isObjectArray: false,
      },
    ],

    expandedEvent: {
      eventId: '',
      indexName: 'testIndexName',
      refetch: jest.fn(),
    },
    handleIsolationActionSuccess: jest.fn(),
    handleOnEventClosed: jest.fn(),
    hostRisk: null,
    activePanel: null,
    isAlert: false,
    isDraggable: false,
    isolateAction: 'isolateHost',
    loading: false,
    rawEventData: undefined,
    showAlertDetails: jest.fn(),
    timelineId: 'testTimelineId',
  };

  beforeAll(() => {
    (useKibana as jest.Mock).mockImplementation(() => {
      const mockStartServicesMock = createStartServicesMock();

      return {
        services: {
          ...mockStartServicesMock,
          application: {
            capabilities: { osquery: true, notifications: { toasts: true } },
          },
        },
      };
    });

    (useAppToasts as jest.Mock).mockImplementation(() => ({
      addError: addErrorMock,
      addWarning: addWarningMock,
      addSuccess: addSuccessMock,
    }));
  });

  test('should render osquery', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutBody {...defaultProps} activePanel={ACTIVE_PANEL.OSQUERY} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-body-osquery"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-body-default"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="flyout-body-host-isolation"]').exists()).toBeFalsy();
  });

  test('should render host isolation', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutBody {...defaultProps} activePanel={ACTIVE_PANEL.HOST_ISOLATION} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-body-host-isolation"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-body-default"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="flyout-body-osquery"]').exists()).toBeFalsy();
  });
  test('should render default body', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutBody {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-body-default"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-body-host-isolation"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="flyout-body-osquery"]').exists()).toBeFalsy();
  });
});
