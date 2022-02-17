/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { useDateFormat, useKibana, useTimeZone } from '../../../../common/lib/kibana';
import { EventDetailsFlyoutHeader, IFlyoutHeaderProps } from '.';
import { TestProviders } from '../../../../common/mock';
import { ACTIVE_PANEL } from '../event_details';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useDateFormat: jest.fn(),
  useTimeZone: jest.fn(),
}));

describe('Flyout Header', () => {
  let wrapper: ReactWrapper;

  const defaultProps: IFlyoutHeaderProps = {
    isAlert: false,
    isolateAction: 'isolateHost',
    loading: false,
    activePanel: null,
    showAlertDetails: jest.fn(),
    timestamp: 'testTimelineId',
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
    (useDateFormat as jest.Mock).mockImplementation(() => '');
    (useTimeZone as jest.Mock).mockImplementation(() => '');
  });

  test('should render osquery', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutHeader {...defaultProps} activePanel={ACTIVE_PANEL.OSQUERY} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-header-osquery"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-header-default"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="flyout-header-host-isolation"]').exists()).toBeFalsy();
  });

  test('should render host isolation', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutHeader {...defaultProps} activePanel={ACTIVE_PANEL.HOST_ISOLATION} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-header-host-isolation"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-header-default"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="flyout-header-osquery"]').exists()).toBeFalsy();
  });

  test('should render default body', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutHeader {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-header-default"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-header-osquery"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="flyout-header-host-isolation"]').exists()).toBeFalsy();
  });
});
