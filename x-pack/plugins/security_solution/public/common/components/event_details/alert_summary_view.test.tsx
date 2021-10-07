/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, render } from '@testing-library/react';

import { AlertSummaryView } from './alert_summary_view';
import { mockAlertDetailsData } from './__mocks__';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { useRuleWithFallback } from '../../../detections/containers/detection_engine/rules/use_rule_with_fallback';

import { TestProviders, TestProvidersComponent } from '../../mock';
import { mockBrowserFields } from '../../containers/source/mock';

jest.mock('../../lib/kibana');

jest.mock('../../../detections/containers/detection_engine/rules/use_rule_with_fallback', () => {
  return {
    useRuleWithFallback: jest.fn(),
  };
});

const props = {
  data: mockAlertDetailsData as TimelineEventsDetailsItem[],
  browserFields: mockBrowserFields,
  eventId: '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31',
  timelineId: 'detections-page',
};

describe('AlertSummaryView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      rule: {
        note: 'investigation guide',
      },
    });
  });
  test('render correct items', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertSummaryView {...props} />
      </TestProviders>
    );
    expect(getByTestId('summary-view')).toBeInTheDocument();
  });

  test("render no investigation guide if it doesn't exist", async () => {
    (useRuleWithFallback as jest.Mock).mockReturnValue({
      rule: {
        note: null,
      },
    });
    const { queryByTestId } = render(
      <TestProviders>
        <AlertSummaryView {...props} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(queryByTestId('summary-view-guide')).not.toBeInTheDocument();
    });
  });
  test('Memory event code renders additional summary rows', () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            category: 'event',
            field: 'event.code',
            values: ['shellcode_thread'],
            originalValue: ['shellcode_thread'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    const { container } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );
    expect(container.querySelector('div[data-test-subj="summary-view"]')).toMatchSnapshot();
  });
  test('Behavior event code renders additional summary rows', () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            category: 'event',
            field: 'event.code',
            values: ['behavior'],
            originalValue: ['behavior'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    const { container } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );
    expect(container.querySelector('div[data-test-subj="summary-view"]')).toMatchSnapshot();
  });

  test("doesn't render empty fields", () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'signal' && item.field === 'signal.rule.name') {
          return {
            category: 'signal',
            field: 'signal.rule.name',
            values: undefined,
            originalValue: undefined,
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };

    const { queryByTestId } = render(
      <TestProviders>
        <AlertSummaryView {...renderProps} />
      </TestProviders>
    );

    expect(queryByTestId('event-field-signal.rule.name')).not.toBeInTheDocument();
  });
});
