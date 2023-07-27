/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';
import { ChatPromptEditor as Component, ChatPromptEditorProps } from './chat_prompt_editor';

export default {
  component: Component,
  title: 'app/Molecules/ChatPromptEditor',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: ChatPromptEditorProps) => {
  return <Component {...props} />;
};

const defaultProps = {};

export const ChatPromptEditor = Template.bind({});
ChatPromptEditor.args = defaultProps;
