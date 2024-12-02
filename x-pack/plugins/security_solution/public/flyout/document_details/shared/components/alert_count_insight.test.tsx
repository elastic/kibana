/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AlertCountInsight, getFormattedAlertStats } from './alert_count_insight';
import { useAlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import type { ParsedAlertsData } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { SEVERITY_COLOR } from '../../../../overview/components/detection_response/utils';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');
jest.mock(
  '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status'
);

const fieldName = 'host.name';
const name = 'test host';
const testId = 'test';
const mockAlertData: ParsedAlertsData = {
  open: {
    total: 4,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
      { key: 'medium', value: 1, label: 'Medium' },
      { key: 'critical', value: 1, label: 'Critical' },
    ],
  },
  acknowledged: {
    total: 4,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
      { key: 'medium', value: 1, label: 'Medium' },
      { key: 'critical', value: 1, label: 'Critical' },
    ],
  },
  closed: {
    total: 6,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
      { key: 'medium', value: 2, label: 'Medium' },
      { key: 'critical', value: 2, label: 'Critical' },
    ],
  },
};

const renderAlertCountInsight = () => {
  return render(
    <TestProviders>
      <AlertCountInsight name={name} fieldName={fieldName} data-test-subj={testId} />
    </TestProviders>
  );
};

describe('AlertCountInsight', () => {
  it('renders', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      items: mockAlertData,
    });
    const { getByTestId } = renderAlertCountInsight();
    expect(getByTestId(testId)).toBeInTheDocument();
    expect(getByTestId(`${testId}-distribution-bar`)).toBeInTheDocument();
    expect(getByTestId(`${testId}-count`)).toHaveTextContent('8');
  });

  it('renders loading spinner if data is being fetched', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({ isLoading: true, items: {} });
    const { getByTestId } = renderAlertCountInsight();
    expect(getByTestId(`${testId}-loading-spinner`)).toBeInTheDocument();
  });

  it('renders null if no alert data found', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({ isLoading: false, items: {} });
    const { container } = renderAlertCountInsight();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders null if no non-closed alert data found', () => {
    (useAlertsByStatus as jest.Mock).mockReturnValue({
      isLoading: false,
      items: {
        closed: {
          total: 6,
          severities: [
            { key: 'high', value: 1, label: 'High' },
            { key: 'low', value: 1, label: 'Low' },
            { key: 'medium', value: 2, label: 'Medium' },
            { key: 'critical', value: 2, label: 'Critical' },
          ],
        },
      },
    });
    const { container } = renderAlertCountInsight();
    expect(container).toBeEmptyDOMElement();
  });
});

describe('getFormattedAlertStats', () => {
  it('should return alert stats', () => {
    const alertStats = getFormattedAlertStats(mockAlertData);
    expect(alertStats).toEqual([
      { key: 'High', count: 2, color: SEVERITY_COLOR.high },
      { key: 'Low', count: 2, color: SEVERITY_COLOR.low },
      { key: 'Medium', count: 2, color: SEVERITY_COLOR.medium },
      { key: 'Critical', count: 2, color: SEVERITY_COLOR.critical },
    ]);
  });

  it('should return empty array if no active alerts are available', () => {
    const alertStats = getFormattedAlertStats({
      closed: {
        total: 2,
        severities: [
          { key: 'high', value: 1, label: 'High' },
          { key: 'low', value: 1, label: 'Low' },
        ],
      },
    });
    expect(alertStats).toEqual([]);
  });
});
