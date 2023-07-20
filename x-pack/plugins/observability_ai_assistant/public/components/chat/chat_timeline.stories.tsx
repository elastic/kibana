/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { ChatTimeline as Component, ChatTimelineProps } from './chat_timeline';
import { buildAssistantMessage, buildElasticMessage, buildUserMessage } from '../../utils/builders';

export default {
  component: Component,
  title: 'app/Molecules/ChatTimeline',
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: ChatTimelineProps) => (
  <Component {...props} />
);

const defaultProps = {
  messages: [
    buildUserMessage(),
    buildAssistantMessage(),
    buildUserMessage(),
    buildElasticMessage(),
  ],
};

export const ChatTimeline = Template.bind({});
ChatTimeline.args = defaultProps;
