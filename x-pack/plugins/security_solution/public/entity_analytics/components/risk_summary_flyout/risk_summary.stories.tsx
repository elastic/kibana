/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { mockRiskScoreState } from '../../../timelines/components/side_panel/new_user_detail/__mocks__';
import { RiskSummary } from './risk_summary';

export default {
  component: RiskSummary,
  title: 'Components/RiskSummary',
};

export const Default: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '300px' }}>
          <RiskSummary
            openDetailsPanel={() => {}}
            riskScoreData={{ ...mockRiskScoreState, data: [] }}
            queryId={'testQuery'}
            recalculatingScore={false}
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};

export const PreviewMode: Story<void> = () => {
  return (
    <StorybookProviders>
      <TestProvider>
        <div style={{ maxWidth: '300px' }}>
          <RiskSummary
            riskScoreData={{ ...mockRiskScoreState, data: [] }}
            queryId={'testQuery'}
            recalculatingScore={false}
            isPreviewMode
          />
        </div>
      </TestProvider>
    </StorybookProviders>
  );
};
