/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../../common/mocks/story_providers';
import { generateMockIndicator, Indicator } from '../../../../../../common/types/indicator';
import { IndicatorsFlyoutOverview } from '.';
import { IndicatorsFiltersContext } from '../../../containers/filters';

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

  return (
    <StoryProvidersComponent>
      <IndicatorsFiltersContext.Provider value={{} as any}>
        <IndicatorsFlyoutOverview onViewAllFieldsInTable={() => {}} indicator={mockIndicator} />
      </IndicatorsFiltersContext.Provider>
    </StoryProvidersComponent>
  );
};
