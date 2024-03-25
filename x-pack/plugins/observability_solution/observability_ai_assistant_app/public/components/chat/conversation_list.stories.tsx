/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator';
import { ConversationList as Component } from './conversation_list';

type ConversationListProps = React.ComponentProps<typeof Component>;

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/ConversationList',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const Wrapper = (props: ConversationListProps) => {
  return (
    <div style={{ minHeight: 800, maxWidth: 240, display: 'flex' }}>
      <Component {...props} />
    </div>
  );
};

export const ChatHeaderLoading: ComponentStoryObj<typeof Component> = {
  args: {},
  render: Wrapper,
};

export const ChatHeaderError: ComponentStoryObj<typeof Component> = {
  args: {},
  render: Wrapper,
};

export const ChatHeaderLoaded: ComponentStoryObj<typeof Component> = {
  args: {
    selectedConversationId: '',
  },
  render: Wrapper,
};

export const ChatHeaderEmpty: ComponentStoryObj<typeof Component> = {
  args: {
    selectedConversationId: '',
  },
  render: Wrapper,
};
