/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { AssistantAvatar as Component, AssistantAvatarProps } from './assistant_avatar';

export default {
  component: Component,
  title: 'app/Atoms/AssistantAvatar',
  argTypes: {
    size: {
      options: ['xs', 's', 'm', 'l', 'xl'],
      control: { type: 'radio' },
    },
  },
};

const Template: ComponentStory<typeof Component> = (props: AssistantAvatarProps) => (
  <Component {...props} />
);

const defaultProps = {
  size: 'm' as const,
};

export const AssistantAvatar = Template.bind({});
AssistantAvatar.args = defaultProps;
