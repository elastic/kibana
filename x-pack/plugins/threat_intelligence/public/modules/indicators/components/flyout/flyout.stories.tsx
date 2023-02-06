/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../common/mocks/story_providers';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { IndicatorsFlyout } from '.';

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
