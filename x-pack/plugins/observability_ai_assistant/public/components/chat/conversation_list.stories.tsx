/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator';
import { ConversationList as Component } from './conversation_list';

export default {
  component: Component,
  title: 'app/Organisms/ConversationList',
  decorators: [KibanaReactStorybookDecorator],
};

type ConversationListProps = React.ComponentProps<typeof Component>;

const Template: ComponentStory<typeof Component> = (props: ConversationListProps) => {
  return (
    <div style={{ minHeight: 800, display: 'flex' }}>
      <Component {...props} />
    </div>
  );
};

const defaultProps: ConversationListProps = {
  onClickConversation: (conversationId: string) => {},
  onClickNewChat: () => {},
  onClickSettings: () => {},
};

export const ConversationList = Template.bind({});
ConversationList.args = defaultProps;
