/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { ComponentStory } from '@storybook/react';
import { EuiButton, EuiSpacer } from '@elastic/eui';

import { ChatTimeline as Component, ChatTimelineProps } from './chat_timeline';
import {
  buildAssistantInnerMessage,
  buildElasticInnerMessage,
  buildMessage,
  buildSystemInnerMessage,
  buildUserInnerMessage,
} from '../../utils/builders';

export default {
  component: Component,
  title: 'app/Molecules/ChatTimeline',
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: ChatTimelineProps) => {
  const [count, setCount] = useState(0);

  return (
    <>
      <Component {...props} messages={props.messages.filter((_, index) => index <= count)} />

      <EuiSpacer />

      <EuiButton
        onClick={() => setCount(count >= 0 && count < props.messages.length - 1 ? count + 1 : 0)}
      >
        Add message
      </EuiButton>
    </>
  );
};

const currentDate = new Date();

const defaultProps = {
  messages: [
    buildMessage({
      '@timestamp': String(new Date(currentDate.getTime())),
      message: buildSystemInnerMessage(),
    }),
    buildMessage({
      '@timestamp': String(new Date(currentDate.getTime() + 1000)),
      message: buildUserInnerMessage(),
    }),
    buildMessage({
      '@timestamp': String(new Date(currentDate.getTime() + 2000)),
      message: buildAssistantInnerMessage(),
    }),
    buildMessage({
      '@timestamp': String(new Date(currentDate.getTime() + 3000)),
      message: buildUserInnerMessage({ content: 'How does it work?' }),
    }),
    buildMessage({
      '@timestamp': String(new Date(currentDate.getTime() + 4000)),
      message: buildElasticInnerMessage({ content: 'Here you go.' }),
    }),
  ],
};

export const ChatTimeline = Template.bind({});
ChatTimeline.args = defaultProps;
