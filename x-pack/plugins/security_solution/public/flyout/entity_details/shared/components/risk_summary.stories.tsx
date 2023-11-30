/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { StorybookProviders } from '../../../../common/mock/storybook_providers';
import { mockRiskScoreState } from '../../../../timelines/components/side_panel/new_user_detail/__mocks__';
import { RiskSummary } from './risk_summary';

export default {
  component: RiskSummary,
  title: 'Components/RiskSummary',
};

const flyoutContextValue = {
  openLeftPanel: () => window.alert('openLeftPanel called'),
  panels: {},
} as unknown as ExpandableFlyoutContextValue;

export const Default: Story<void> = () => {
  return (
    <StorybookProviders>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <div style={{ maxWidth: '300px' }}>
          <RiskSummary riskScoreData={mockRiskScoreState} queryId={'testQuery'} />
        </div>
      </ExpandableFlyoutContext.Provider>
    </StorybookProviders>
  );
};
