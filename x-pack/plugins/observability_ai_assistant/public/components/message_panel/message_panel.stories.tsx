/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel } from '@elastic/eui';
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { FeedbackButtons } from '../feedback_buttons';
import { MessagePanel as Component } from './message_panel';
import { MessageText } from './message_text';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/MessagePanel',
};

export default meta;

export const ContentLoading: ComponentStoryObj<typeof Component> = {
  render: (props, context) => {
    return (
      <EuiPanel>
        <Component {...props} />
      </EuiPanel>
    );
  },
  args: {
    body: (
      <MessageText
        content={`# This is a piece of text.
      
And an extra _paragraph_.

\`This is inline code\`

\`\`\`
This is a code block
\`\`\`
      
#### With a title

This text is loa`}
        loading
      />
    ),
  },
};

export const ContentLoaded: ComponentStoryObj<typeof Component> = {
  args: {
    body: <MessageText content={`This response has fully loaded.`} loading={false} />,
  },
};

export const ContentFailed: ComponentStoryObj<typeof Component> = {
  args: {
    body: <MessageText content={`This is a partial re`} loading={false} />,
    error: new Error(),
  },
};

export const Controls: ComponentStoryObj<typeof Component> = {
  args: {
    body: <MessageText content={`This is a partial re`} loading={false} />,
    error: new Error(),
    controls: <FeedbackButtons onClickFeedback={() => {}} />,
  },
};
