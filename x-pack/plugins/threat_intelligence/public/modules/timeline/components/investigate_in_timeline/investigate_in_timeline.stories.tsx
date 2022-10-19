/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../common/mocks/story_providers';
import { generateMockUrlIndicator } from '../../../indicators';
import { InvestigateInTimelineButton, InvestigateInTimelineButtonIcon } from '.';

export default {
  title: 'InvestigateInTimeline',
};

const mockIndicator = generateMockUrlIndicator();

export const Button: Story<void> = () => {
  return (
    <StoryProvidersComponent>
      <InvestigateInTimelineButton data={mockIndicator} />
    </StoryProvidersComponent>
  );
};

export const ButtonIcon: Story<void> = () => {
  return (
    <StoryProvidersComponent>
      <InvestigateInTimelineButtonIcon data={mockIndicator} />
    </StoryProvidersComponent>
  );
};
