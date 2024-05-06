/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { GroupBySelection } from '../../../../components/alerts_kpis/alerts_progress_bar_panel/types';
import { TestProviders } from '../../../../../common/mock';
import { ChartCollapse } from '.';
import { useSummaryChartData } from '../../../../components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';
import * as mock from './mock_data';

jest.mock('../../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('../../../../components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data');

const defaultProps = {
  groupBySelection: 'host.name' as GroupBySelection,
  signalIndexName: 'signalIndexName',
};

const severitiesId = '[data-test-subj="chart-collapse-severities"]';
const ruleId = '[data-test-subj="chart-collapse-top-rule"]';
const groupId = '[data-test-subj="chart-collapse-top-group"]';

describe('ChartCollapse', () => {
  const mockUseSummaryChartData = useSummaryChartData as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the chart collapse panel and the 3 summary componenets', () => {
    mockUseSummaryChartData.mockReturnValue({ items: [], isLoading: false });
    const { container } = render(
      <TestProviders>
        <ChartCollapse {...defaultProps} />
      </TestProviders>
    );
    expect(container.querySelector('[data-test-subj="chart-collapse"]')).toBeInTheDocument();

    expect(container.querySelector(severitiesId)).toBeInTheDocument();
    expect(container.querySelector(ruleId)).toBeInTheDocument();
    expect(container.querySelector(groupId)).toBeInTheDocument();
  });

  test('it renders chart collapse with data', () => {
    mockUseSummaryChartData.mockReturnValue({ items: mock.parsedAlerts, isLoading: false });
    const { container } = render(
      <TestProviders>
        <ChartCollapse {...defaultProps} />
      </TestProviders>
    );

    mock.parsedAlerts.at(0)?.severities.forEach((severity) => {
      expect(container.querySelector(severitiesId)).toHaveTextContent(
        `${severity.label}: ${severity.value}`
      );
    });
    expect(container.querySelector(ruleId)).toHaveTextContent('Top alerted rule: Test rule');
    expect(container.querySelector(groupId)).toHaveTextContent('Top alerted host: Test group');
  });

  test('it renders chart collapse without data', () => {
    mockUseSummaryChartData.mockReturnValue({ items: [], isLoading: false });
    const { container } = render(
      <TestProviders>
        <ChartCollapse {...defaultProps} />
      </TestProviders>
    );
    mock.parsedAlerts.at(0)?.severities.forEach((severity) => {
      expect(container.querySelector(severitiesId)).toHaveTextContent(`${severity.label}: 0`);
    });
    expect(container.querySelector(ruleId)).toHaveTextContent('Top alerted rule: None');
    expect(container.querySelector(groupId)).toHaveTextContent('Top alerted host: None');
  });

  test('it renders group by label correctly', () => {
    mockUseSummaryChartData.mockReturnValue({ items: [], isLoading: false });
    const { container } = render(
      <TestProviders>
        <ChartCollapse {...defaultProps} groupBySelection={'user.name'} />
      </TestProviders>
    );
    expect(container.querySelector(groupId)).toHaveTextContent('Top alerted user: None');
  });
});
