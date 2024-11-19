/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel } from '@elastic/eui';
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import dedent from 'dedent';
import React from 'react';
import { FeedbackButtons } from '../buttons/feedback_buttons';
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
        onActionClick={async () => {}}
      />
    ),
  },
};

export const ContentLoaded: ComponentStoryObj<typeof Component> = {
  args: {
    body: (
      <MessageText
        content={`This response has fully loaded.`}
        loading={false}
        onActionClick={async () => {}}
      />
    ),
  },
};

export const ContentFailed: ComponentStoryObj<typeof Component> = {
  args: {
    body: (
      <MessageText
        content={`This is a partial re`}
        loading={false}
        onActionClick={async () => {}}
      />
    ),
    error: true,
  },
};

export const ContentTable: ComponentStoryObj<typeof Component> = {
  args: {
    body: (
      <MessageText
        content={dedent(`Here are the active alerts for the last 24 hours:

    | Alert ID | Service Name | Environment | Transaction Type | Latency (ms) | Status | Start Time | End Time |
    | --- | --- | --- | --- | --- | --- | --- | --- |
    | ff188d17-3a7b-4f1f-9db1-369d587496f5 | opbeans-frontend | production | page-load | 5734.399 | recovered | 2023-08-22T16:54:54.436Z | 2023-08-22T16:55:58.810Z |
    | c149225f-2b25-4e5a-b276-3a08b8f0fd2d | opbeans-python | production | request | 173.055 | recovered | 2023-08-22T16:54:54.436Z | 2023-08-22T19:05:10.901Z |
    | 0c3a1f89-5220-4879-9cde-26d4b2160b5d | opbeans-python | production | celery | 2170.367 | recovered | 2023-08-22T19:06:42.774Z | 2023-08-22T19:11:03.540Z |
    | db82f264-8d0d-4436-81bc-b316fc1693d3 | opbeans-swift | default | mobile | 405.487 | recovered | 2023-08-22T19:06:42.774Z | 2023-08-22T19:11:03.540Z |
    | 3095173a-07c7-4e4b-8a32-292f853c2e16 | opbeans-python | production | celery | 229.175 | recovered | 2023-08-22T19:17:05.411Z | 2023-08-22T19:19:11.414Z |
    | d8201f2f-ff16-4fb1-baab-fed314e11b55 | opbeans-python | production | request | 375.082 | recovered | 2023-08-22T19:06:42.774Z | 2023-08-22T19:21:31.972Z |
    | 66f31431-463a-40c4-bb19-4acd3aac7c30 | opbeans-python | production | celery | 264.020 | recovered | 2023-08-22T19:23:36.885Z | 2023-08-22T19:30:58.383Z |
    | 7a128aca-940a-4d4f-a4a2-5950467d7866 | opbeans-swift | default | mobile | 373.360 | recovered | 2023-08-22T19:25:43.471Z | 2023-08-22T19:30:58.383Z |
    | 82feefe0-c81b-442f-9700-d1e4d7b1a28c | opbeans-frontend | production | page-load | 2179.071 | recovered | 2023-08-22T19:32:01.114Z | 2023-08-22T19:35:09.638Z |
    | bd716922-8a4d-44b7-ac1a-863ac4d25597 | opbeans-frontend | production | Component | 4030.463 | recovered | 2023-08-22T19:33:04.081Z | 2023-08-22T19:36:12.125Z |
    
    Please note that all times are in UTC.`)}
        loading={false}
        onActionClick={async () => {}}
      />
    ),
  },
};

export const Controls: ComponentStoryObj<typeof Component> = {
  args: {
    body: (
      <MessageText
        content={`This is a partial re`}
        loading={false}
        onActionClick={async () => {}}
      />
    ),
    error: true,
    controls: <FeedbackButtons onClickFeedback={() => {}} />,
  },
};
