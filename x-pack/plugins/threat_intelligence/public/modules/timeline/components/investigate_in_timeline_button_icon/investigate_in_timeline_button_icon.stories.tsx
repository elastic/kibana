/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../common/mocks/story_providers';
import { generateMockUrlIndicator } from '../../../../../common/types/indicator';
import { InvestigateInTimelineButtonIcon } from './investigate_in_timeline_button_icon';

export default {
  component: InvestigateInTimelineButtonIcon,
  title: 'InvestigateInTimelineButtonIcon',
};

const mockIndicator = generateMockUrlIndicator();

export const Default: Story<void> = () => {
  return (
    <StoryProvidersComponent>
      <InvestigateInTimelineButtonIcon data={mockIndicator} />
    </StoryProvidersComponent>
  );
};
