/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { getAssistantSetupMessage } from '../../service/get_assistant_setup_message';
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
  title: 'How is this working',
  messages: [getAssistantSetupMessage({ contexts: [] })],
  startedFrom: 'appTopNavbar',
  onClose: () => {},
  onChatComplete: () => {},
  onChatTitleSave: () => {},
  onChatUpdate: () => {},
};

export const ChatFlyout = Template.bind({});
ChatFlyout.args = defaultProps;
