/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../../common/mocks/story_providers';
import { IndicatorEmptyPrompt } from '.';

export default {
  component: IndicatorEmptyPrompt,
  title: 'IndicatorEmptyPrompt',
};

export const Default: Story<void> = () => {
  return (
    <StoryProvidersComponent>
      <IndicatorEmptyPrompt />
    </StoryProvidersComponent>
  );
};
