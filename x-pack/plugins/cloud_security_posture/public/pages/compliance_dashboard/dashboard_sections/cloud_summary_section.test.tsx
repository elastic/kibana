/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { expectIdsInDoc } from '../../../test/utils';
import { DASHBOARD_COUNTER_CARDS } from '../test_subjects';
import { CloudSummarySection } from './cloud_summary_section';
import { mockDashboardData } from '../compliance_dashboard.test';
import { TestProvider } from '../../../test/test_provider';
import { screen } from '@testing-library/react';

describe('<CloudSummarySection />', () => {
  const renderCloudSummarySection = (alterMockData = {}) => {
    render(
      <TestProvider>
        <CloudSummarySection complianceData={{ ...mockDashboardData, ...alterMockData }} />
      </TestProvider>
    );
  };

  it('renders all counter cards', () => {
    renderCloudSummarySection();

    expectIdsInDoc({
      be: [
        DASHBOARD_COUNTER_CARDS.CLUSTERS_EVALUATED,
        DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED,
        DASHBOARD_COUNTER_CARDS.FAILING_FINDINGS,
      ],
    });
  });

  it('renders counters content according to mock', async () => {
    renderCloudSummarySection();

    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.CLUSTERS_EVALUATED)).toHaveTextContent('1');
    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED)).toHaveTextContent(
      '162'
    );
    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.FAILING_FINDINGS)).toHaveTextContent('17');
  });

  it('renders counters value in compact abbreviation if its above one million', () => {
    renderCloudSummarySection({ stats: { resourcesEvaluated: 999999, totalFailed: 1000000 } });

    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED)).toHaveTextContent(
      '999,999'
    );
    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.FAILING_FINDINGS)).toHaveTextContent('1M');
  });

  it('renders 0 as empty state', () => {
    renderCloudSummarySection({ stats: { totalFailed: undefined } });

    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.FAILING_FINDINGS)).toHaveTextContent('0');
  });
});
