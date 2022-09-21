/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../../../common/mocks/story_providers';
import { generateMockIndicator, Indicator } from '../../../../../../types/indicator';
import { IndicatorFlyoutOverviewTab } from '.';
import { FiltersContext } from '../../../../contexts';

export default {
  component: IndicatorFlyoutOverviewTab,
  title: 'IndicatorFlyoutOverviewTab',
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
      <FiltersContext.Provider value={{} as any}>
        <IndicatorFlyoutOverviewTab onViewAllFieldsInTable={() => {}} indicator={mockIndicator} />
      </FiltersContext.Provider>
    </StoryProvidersComponent>
  );
};
