/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import {
  HideExpandConversationListButton as Component,
  HideExpandConversationListButtonProps,
} from './hide_expand_conversation_list_button';

export default {
  component: Component,
  title: 'app/Atoms/HideExpandConversationListButton',
  argTypes: {
    isExpanded: {
      control: {
        type: 'boolean',
      },
    },
  },
};

const Template: ComponentStory<typeof Component> = (
  props: HideExpandConversationListButtonProps
) => <Component {...props} />;

const defaultProps = {
  isExpanded: true,
};

export const HideExpandConversationListButton = Template.bind({});
HideExpandConversationListButton.args = defaultProps;
