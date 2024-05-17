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
import { IndicatorsFlyout } from './flyout';

export default {
  component: IndicatorsFlyout,
  title: 'IndicatorsFlyout',
};

export const Default: Story<void> = () => {
  const mockIndicator: Indicator = generateMockIndicator();

  return (
    <StoryProvidersComponent>
      <IndicatorsFlyout
        indicator={mockIndicator}
        closeFlyout={() => window.alert('Closing flyout')}
      />
    </StoryProvidersComponent>
  );
};

export const EmptyIndicator: Story<void> = () => {
  return (
    <StoryProvidersComponent>
      <IndicatorsFlyout
        indicator={{ fields: {} } as Indicator}
        closeFlyout={() => window.alert('Closing flyout')}
      />
    </StoryProvidersComponent>
  );
};
