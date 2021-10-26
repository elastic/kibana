/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';

import { ErrorGroupList } from '.';

type Args = ComponentProps<typeof ErrorGroupList>;

const stories: Meta<Args> = {
  title: 'app/ErrorGroupOverview/ErrorGroupList',
  component: ErrorGroupList,
  decorators: [
    (StoryComponent) => {
      return (
        <MemoryRouter>
          <MockApmPluginContextWrapper>
            <MockUrlParamsContextProvider>
              <StoryComponent />
            </MockUrlParamsContextProvider>
          </MockApmPluginContextWrapper>
        </MemoryRouter>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = (args) => {
  return <ErrorGroupList {...args} />;
};
Example.args = {
  items: [
    {
      message: 'net/http: abort Handler',
      occurrenceCount: 14,
      culprit: 'Main.func2',
      groupId: '83a653297ec29afed264d7b60d5cda7b',
      latestOccurrenceAt: '2021-10-21T16:18:41.434Z',
      handled: false,
      type: 'errorString',
    },
    {
      message: 'POST /api/orders (500)',
      occurrenceCount: 5,
      culprit: 'logrusMiddleware',
      groupId: '7a640436a9be648fd708703d1ac84650',
      latestOccurrenceAt: '2021-10-21T16:18:40.162Z',
      handled: false,
      type: 'OpError',
    },
    {
      message:
        'write tcp 10.36.2.24:3000->10.36.1.14:34232: write: connection reset by peer',
      occurrenceCount: 4,
      culprit: 'apiHandlers.getProductCustomers',
      groupId: '95ca0e312c109aa11e298bcf07f1445b',
      latestOccurrenceAt: '2021-10-21T16:18:42.650Z',
      handled: false,
      type: 'OpError',
    },
    {
      message:
        'write tcp 10.36.0.21:3000->10.36.1.252:57070: write: connection reset by peer',
      occurrenceCount: 3,
      culprit: 'apiHandlers.getCustomers',
      groupId: '4053d7e33d2b716c819bd96d9d6121a2',
      latestOccurrenceAt: '2021-10-21T16:07:44.078Z',
      handled: false,
      type: 'OpError',
    },
    {
      message:
        'write tcp 10.36.0.21:3000->10.36.0.88:33926: write: broken pipe',
      occurrenceCount: 2,
      culprit: 'apiHandlers.getOrders',
      groupId: '94f4ca8ec8c02e5318cf03f46ae4c1f3',
      latestOccurrenceAt: '2021-10-21T16:13:45.742Z',
      handled: false,
      type: 'OpError',
    },
  ],
  serviceName: 'test service',
};

export const EmptyState: Story<Args> = (args) => {
  return <ErrorGroupList {...args} />;
};
EmptyState.args = {
  items: [],
  serviceName: 'test service',
};
