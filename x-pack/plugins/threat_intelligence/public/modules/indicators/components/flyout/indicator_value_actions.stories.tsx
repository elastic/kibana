/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../mocks/story_providers';
import { generateMockFileIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorValueActions } from './indicator_value_actions';
import { IndicatorsFlyoutContext } from '../../hooks/use_flyout_context';

const coreStart = coreMock.createStart();

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
        <IndicatorValueActions indicator={indicator} field={field} startServices={coreStart} />
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
        <IndicatorValueActions indicator={indicator} field={field} startServices={coreStart} />
      </IndicatorsFlyoutContext.Provider>
    </StoryProvidersComponent>
  );
};
