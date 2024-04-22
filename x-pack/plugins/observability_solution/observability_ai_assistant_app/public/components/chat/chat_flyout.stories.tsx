/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { getAssistantSystemMessage } from '@kbn/observability-ai-assistant-plugin/public';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator';
import { ChatFlyout as Component } from './chat_flyout';

export default {
  component: Component,
  title: 'app/Organisms/ChatFlyout',
  decorators: [KibanaReactStorybookDecorator],
};

type ChatFlyoutProps = React.ComponentProps<typeof Component>;

const Template: ComponentStory<typeof Component> = (props: ChatFlyoutProps) => {
  return (
    <div style={{ display: 'flex', minHeight: 800, maxWidth: 600 }}>
      <Component {...props} />
    </div>
  );
};

const defaultProps: ChatFlyoutProps = {
  isOpen: true,
  initialTitle: 'How is this working',
  initialMessages: [getAssistantSystemMessage({ contexts: [] })],
  onClose: () => {},
};

export const ChatFlyout = Template.bind({});
ChatFlyout.args = defaultProps;
