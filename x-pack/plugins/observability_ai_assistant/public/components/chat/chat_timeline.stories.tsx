/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';
import React, { ComponentProps, useState } from 'react';
import { MessageRole } from '../../../common';
import {
  buildAssistantChatItem,
  buildChatInitItem,
  buildFunctionChatItem,
  buildUserChatItem,
} from '../../utils/builders';
import { ChatTimeline as Component, ChatTimelineProps } from './chat_timeline';

export default {
  component: Component,
  title: 'app/Organisms/ChatTimeline',
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
  argTypes: {},
};

const Template: ComponentStory<typeof Component> = (props: ChatTimelineProps) => {
  const [count, setCount] = useState(props.items.length - 1);

  return (
    <>
      <Component {...props} items={props.items.filter((_, index) => index <= count)} />

      <EuiSpacer />

      <EuiButton
        data-test-subj="observabilityAiAssistantTemplateAddMessageButton"
        onClick={() => setCount(count >= 0 && count < props.items.length - 1 ? count + 1 : 0)}
      >
        Add message
      </EuiButton>
    </>
  );
};

const defaultProps: ComponentProps<typeof Component> = {
  knowledgeBase: {
    status: {
      loading: false,
      value: {
        ready: true,
      },
      refresh: () => {},
    },
    isInstalling: false,
    installError: undefined,
    install: async () => {},
  },
  items: [
    buildChatInitItem(),
    buildUserChatItem(),
    buildAssistantChatItem(),
    buildUserChatItem({ content: 'How does it work?' }),
    buildAssistantChatItem({
      content: `The way functions work depends on whether we are talking about mathematical functions or programming functions. Let's explore both:

        Mathematical Functions:
        In mathematics, a function maps input values to corresponding output values based on a specific rule or expression. The general process of how a mathematical function works can be summarized as follows:
        Step 1: Input - You provide an input value to the function, denoted as 'x' in the notation f(x). This value represents the independent variable.
        
        Step 2: Processing - The function takes the input value and applies a specific rule or algorithm to it. This rule is defined by the function itself and varies depending on the function's expression.
        
        Step 3: Output - After processing the input, the function produces an output value, denoted as 'f(x)' or 'y'. This output represents the dependent variable and is the result of applying the function's rule to the input.
        
        Step 4: Uniqueness - A well-defined mathematical function ensures that each input value corresponds to exactly one output value. In other words, the function should yield the same output for the same input whenever it is called.`,
    }),
    buildUserChatItem({
      content: 'Can you execute a function?',
    }),
    buildAssistantChatItem({
      content: 'Sure, I can do that.',
      title: 'suggested a function',
      function_call: {
        name: 'a_function',
        arguments: '{ "foo": "bar" }',
        trigger: MessageRole.Assistant,
      },
      actions: {
        canEdit: false,
        canCopy: true,
        canGiveFeedback: true,
        canRegenerate: true,
      },
    }),
    buildFunctionChatItem({
      content: '{ "message": "The arguments are wrong" }',
      error: new Error(),
      actions: {
        canRegenerate: false,
        canEdit: true,
        canGiveFeedback: false,
        canCopy: true,
      },
    }),
    buildAssistantChatItem({
      content: '',
      title: 'suggested a function',
      function_call: {
        name: 'a_function',
        arguments: '{ "bar": "foo" }',
        trigger: MessageRole.Assistant,
      },
      actions: {
        canEdit: true,
        canCopy: true,
        canGiveFeedback: true,
        canRegenerate: true,
      },
    }),
    buildFunctionChatItem({
      content: '',
      title: 'are executing a function',
      loading: true,
    }),
  ],
  onEdit: async () => {},
  onFeedback: () => {},
  onRegenerate: () => {},
  onStopGenerating: () => {},
};

export const ChatTimeline = Template.bind({});
ChatTimeline.args = defaultProps;
