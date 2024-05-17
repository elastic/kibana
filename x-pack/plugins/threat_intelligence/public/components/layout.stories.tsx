/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { Story } from '@storybook/react';
import React from 'react';
import { StoryProvidersComponent } from '../mocks/story_providers';
import { DefaultPageLayout } from './layout';

export default {
  title: 'DefaultPageLayout',
  component: DefaultPageLayout,
};

export const Default: Story<void> = () => {
  const title = 'Title with border below';
  const children = <EuiText>Content with border above</EuiText>;

  return (
    <StoryProvidersComponent>
      <DefaultPageLayout pageTitle={title} children={children} />
    </StoryProvidersComponent>
  );
};

export const NoBorder: Story<void> = () => {
  const title = 'Title without border';
  const border = false;
  const children = <EuiText>Content without border</EuiText>;

  return (
    <StoryProvidersComponent>
      <DefaultPageLayout pageTitle={title} border={border} children={children} />
    </StoryProvidersComponent>
  );
};
