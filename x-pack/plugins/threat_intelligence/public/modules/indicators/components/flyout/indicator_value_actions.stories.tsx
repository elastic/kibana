/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import React from 'react';
import { Indicator, generateMockFileIndicator } from '../../../../../common/types/indicator';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';
import { IndicatorValueActions } from './indicator_value_actions';

export default {
  title: 'IndicatorValueActions',
};

const indicator: Indicator = generateMockFileIndicator();
const field: string = 'threat.indicator.name';

export const Default: Story<void> = () => {
  const context = {
    kqlBarIntegration: true,
  };
  return (
    <StoryProvidersComponent>
      <IndicatorsFlyoutContext.Provider value={context}>
        <IndicatorValueActions indicator={indicator} field={field} />
      </IndicatorsFlyoutContext.Provider>
    </StoryProvidersComponent>
  );
};

export const WithoutFilterInOut: Story<void> = () => {
  const context = {
    kqlBarIntegration: false,
  };
  return (
    <StoryProvidersComponent>
      <IndicatorsFlyoutContext.Provider value={context}>
        <IndicatorValueActions indicator={indicator} field={field} />
      </IndicatorsFlyoutContext.Provider>
    </StoryProvidersComponent>
  );
};
