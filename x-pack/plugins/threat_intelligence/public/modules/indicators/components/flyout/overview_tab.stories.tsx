/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React from 'react';
import { Indicator, generateMockIndicator } from '../../../../../common/types/indicator';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import { IndicatorsFiltersContext } from '../../hooks/use_filters_context';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';
import { IndicatorsFlyoutOverview } from './overview_tab';

export default {
  component: IndicatorsFlyoutOverview,
  title: 'IndicatorsFlyoutOverview',
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
};

export const Default: Story<void> = () => {
  const mockIndicator: Indicator = generateMockIndicator();
  const context = {
    kqlBarIntegration: false,
  };

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={{} as any}>
        <IndicatorsFlyoutContext.Provider value={context}>
          <IndicatorsFlyoutOverview onViewAllFieldsInTable={() => {}} indicator={mockIndicator} />
        </IndicatorsFlyoutContext.Provider>
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
};
