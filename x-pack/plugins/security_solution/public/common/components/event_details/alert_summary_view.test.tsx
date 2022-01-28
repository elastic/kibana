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
import { TimelineId } from '../../../../common/types';
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
  title: '',
  goToTable: jest.fn(),
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

  test('it renders the action cell by default', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <AlertSummaryView {...props} />
      </TestProviders>
    );
    expect(getAllByTestId('hover-actions-filter-for').length).toBeGreaterThan(0);
  });

  test('it does NOT render the action cell for the active timeline', () => {
    const { queryAllByTestId } = render(
      <TestProviders>
        <AlertSummaryView {...props} timelineId={TimelineId.active} />
      </TestProviders>
    );
    expect(queryAllByTestId('hover-actions-filter-for').length).toEqual(0);
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
  test('Network event renders the correct summary rows', () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.category') {
          return {
            ...item,
            values: ['network'],
            originalValue: ['network'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    const { getByText } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );

    [
      'host.name',
      'user.name',
      'destination.address',
      'source.address',
      'source.port',
      'process.name',
    ].forEach((fieldId) => {
      expect(getByText(fieldId));
    });
  });
  test('Memory event code renders additional summary rows', () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            ...item,
            values: ['shellcode_thread'],
            originalValue: ['shellcode_thread'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    const { getByText } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );
    ['host.name', 'user.name', 'Target.process.executable'].forEach((fieldId) => {
      expect(getByText(fieldId));
    });
  });
  test('Behavior event code renders additional summary rows', () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            ...item,
            values: ['behavior'],
            originalValue: ['behavior'],
          };
        }
        if (item.category === 'event' && item.field === 'event.category') {
          return {
            ...item,
            values: ['malware', 'process', 'file'],
            originalValue: ['malware', 'process', 'file'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    const { getByText } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );
    ['host.name', 'user.name', 'process.name'].forEach((fieldId) => {
      expect(getByText(fieldId));
    });
  });

  test('Ransomware event code resolves fields from the source event', () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'event' && item.field === 'event.code') {
          return {
            ...item,
            values: ['ransomware'],
            originalValue: ['ransomware'],
          };
        }
        if (item.category === 'event' && item.field === 'event.category') {
          return {
            ...item,
            values: ['malware', 'process', 'file'],
            originalValue: ['malware', 'process', 'file'],
          };
        }
        return item;
      }) as TimelineEventsDetailsItem[],
    };
    const { getByText } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );
    ['host.name', 'user.name', 'process.name'].forEach((fieldId) => {
      expect(getByText(fieldId));
    });
  });

  test('Threshold events have special fields', () => {
    const enhancedData = [
      ...mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.type') {
          return {
            ...item,
            values: ['threshold'],
            originalValue: ['threshold'],
          };
        }
        return item;
      }),
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.count',
        values: [9001],
        originalValue: [9001],
      },
      {
        category: 'kibana',
        field: 'kibana.alert.threshold_result.terms',
        values: ['{"field":"host.name","value":"Host-i120rdnmnw"}'],
        originalValue: ['{"field":"host.name","value":"Host-i120rdnmnw"}'],
      },
    ] as TimelineEventsDetailsItem[];
    const renderProps = {
      ...props,
      data: enhancedData,
    };
    const { getByText } = render(
      <TestProvidersComponent>
        <AlertSummaryView {...renderProps} />
      </TestProvidersComponent>
    );

    ['Threshold Count', 'host.name [threshold]'].forEach((fieldId) => {
      expect(getByText(fieldId));
    });
  });

  test("doesn't render empty fields", () => {
    const renderProps = {
      ...props,
      data: mockAlertDetailsData.map((item) => {
        if (item.category === 'kibana' && item.field === 'kibana.alert.rule.name') {
          return {
            category: 'kibana',
            field: 'kibana.alert.rule.name',
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

    expect(queryByTestId('event-field-kibana.alert.rule.name')).not.toBeInTheDocument();
  });
});
