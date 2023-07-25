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
      message: buildAssistantInnerMessage({
        content: `In computer programming and mathematics, a function is a fundamental concept that represents a relationship between input values and output values. It takes one or more input values (also known as arguments or parameters) and processes them to produce a result, which is the output of the function. The input values are passed to the function, and the function performs a specific set of operations or calculations on those inputs to produce the desired output.
      A function is often defined with a name, which serves as an identifier to call and use the function in the code. It can be thought of as a reusable block of code that can be executed whenever needed, and it helps in organizing code and making it more modular and maintainable.`,
      }),
    }),
    buildMessage({
      '@timestamp': String(new Date(currentDate.getTime() + 3000)),
      message: buildUserInnerMessage({ content: 'How does it work?' }),
    }),
    buildMessage({
      '@timestamp': String(new Date(currentDate.getTime() + 4000)),
      message: buildElasticInnerMessage({
        content: `The way functions work depends on whether we are talking about mathematical functions or programming functions. Let's explore both:

        Mathematical Functions:
        In mathematics, a function maps input values to corresponding output values based on a specific rule or expression. The general process of how a mathematical function works can be summarized as follows:
        Step 1: Input - You provide an input value to the function, denoted as 'x' in the notation f(x). This value represents the independent variable.
        
        Step 2: Processing - The function takes the input value and applies a specific rule or algorithm to it. This rule is defined by the function itself and varies depending on the function's expression.
        
        Step 3: Output - After processing the input, the function produces an output value, denoted as 'f(x)' or 'y'. This output represents the dependent variable and is the result of applying the function's rule to the input.
        
        Step 4: Uniqueness - A well-defined mathematical function ensures that each input value corresponds to exactly one output value. In other words, the function should yield the same output for the same input whenever it is called.`,
      }),
    }),
  ],
};

export const ChatTimeline = Template.bind({});
ChatTimeline.args = defaultProps;
