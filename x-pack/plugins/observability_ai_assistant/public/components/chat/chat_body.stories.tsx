/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { ChatBody as Component } from './chat_body';

export default {
  component: Component,
  title: 'app/Organisms/ChatBody',
};

type ChatBodyProps = React.ComponentProps<typeof Component>;

const Template: ComponentStory<typeof Component> = (props: ChatBodyProps) => {
  return (
    <div style={{ minHeight: 800, display: 'flex' }}>
      <Component {...props} />
    </div>
  );
};

const defaultProps: ChatBodyProps = {
  initialConversation: {
    '@timestamp': new Date().toISOString(),
    conversation: {
      title: 'My conversation',
    },
    labels: {},
    numeric_labels: {},
    messages: [],
  },
  connectors: {
    connectors: [
      {
        id: 'foo',
        referencedByCount: 1,
        actionTypeId: 'foo',
        name: 'GPT-v8-ultra',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
      },
    ],
    loading: false,
    error: undefined,
    selectedConnector: 'foo',
    selectConnector: () => {},
  },
  currentUser: {
    username: 'elastic',
  },
  chat: {
    loading: false,
    abort: () => {},
    generate: async () => {
      return {} as any;
    },
  },
};

export const ChatBody = Template.bind({});
ChatBody.args = defaultProps;
