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
import { EventDetailsFlyoutFooter, IFlyoutFooterProps } from '.';
import { TestProviders } from '../../../../common/mock';
import { ACTIVE_PANEL } from '../event_details';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

describe('Flyout Footer', () => {
  let wrapper: ReactWrapper;

  const defaultProps: IFlyoutFooterProps = {
    showHostIsolationPanel: jest.fn(),
    setActivePanel: jest.fn(),
    detailsData: [
      {
        category: 'agent',
        field: 'agent.id',
        values: ['2132131'],
        originalValue: '2132131',
        isObjectArray: false,
      },
    ],
    ecsData: null,
    expandedEvent: {
      eventId: '',
      indexName: 'testIndexName',
      refetch: jest.fn(),
    },
    handleOnEventClosed: jest.fn(),
    activePanel: null,
    loading: false,
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
  });

  test('should render osquery', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutFooter {...defaultProps} activePanel={ACTIVE_PANEL.OSQUERY} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-footer-osquery"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-footer-default"]').exists()).toBeFalsy();
  });

  test('should render default body', () => {
    wrapper = mount(
      <TestProviders>
        <EventDetailsFlyoutFooter {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="flyout-footer-default"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="flyout-footer-osquery"]').exists()).toBeFalsy();
  });
});
