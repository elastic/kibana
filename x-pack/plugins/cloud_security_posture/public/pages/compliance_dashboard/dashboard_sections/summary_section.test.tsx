/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { expectIdsInDoc } from '../../../test/utils';
import { DASHBOARD_COUNTER_CARDS } from '../test_subjects';
import { SummarySection } from './summary_section';
import { mockDashboardData } from '../mock';
import { TestProvider } from '../../../test/test_provider';
import { KSPM_POLICY_TEMPLATE } from '../../../../common/constants';

describe('<CloudSummarySection />', () => {
  const renderCloudSummarySection = (alterMockData = {}) => {
    render(
      <TestProvider>
        <SummarySection
          complianceData={{ ...mockDashboardData, ...alterMockData }}
          dashboardType={KSPM_POLICY_TEMPLATE}
        />
      </TestProvider>
    );
  };

  it('renders all counter cards', () => {
    renderCloudSummarySection();

    expectIdsInDoc({
      be: [DASHBOARD_COUNTER_CARDS.CLUSTERS_EVALUATED, DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED],
    });
  });

  it('renders counters content according to mock', async () => {
    renderCloudSummarySection();

    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.CLUSTERS_EVALUATED)).toHaveTextContent('1');
    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED)).toHaveTextContent(
      '162'
    );
  });

  it('renders counters value in compact abbreviation if its above one million', () => {
    renderCloudSummarySection({ stats: { resourcesEvaluated: 999999, totalFailed: 1000000 } });

    expect(screen.getByTestId(DASHBOARD_COUNTER_CARDS.RESOURCES_EVALUATED)).toHaveTextContent(
      '999,999'
    );
  });
});
