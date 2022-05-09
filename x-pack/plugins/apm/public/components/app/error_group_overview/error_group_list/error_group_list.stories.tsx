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
        <MemoryRouter
          initialEntries={[
            '/services/{serviceName}/errors?rangeFrom=now-15m&rangeTo=now',
          ]}
        >
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
  mainStatistics: [
    {
      name: 'net/http: abort Handler',
      occurrences: 14,
      culprit: 'Main.func2',
      groupId: '83a653297ec29afed264d7b60d5cda7b',
      lastSeen: 1634833121434,
      handled: false,
      type: 'errorString',
    },
    {
      name: 'POST /api/orders (500)',
      occurrences: 5,
      culprit: 'logrusMiddleware',
      groupId: '7a640436a9be648fd708703d1ac84650',
      lastSeen: 1634833121434,
      handled: false,
      type: 'OpError',
    },
    {
      name: 'write tcp 10.36.2.24:3000->10.36.1.14:34232: write: connection reset by peer',
      occurrences: 4,
      culprit: 'apiHandlers.getProductCustomers',
      groupId: '95ca0e312c109aa11e298bcf07f1445b',
      lastSeen: 1634833121434,
      handled: false,
      type: 'OpError',
    },
    {
      name: 'write tcp 10.36.0.21:3000->10.36.1.252:57070: write: connection reset by peer',
      occurrences: 3,
      culprit: 'apiHandlers.getCustomers',
      groupId: '4053d7e33d2b716c819bd96d9d6121a2',
      lastSeen: 1634833121434,
      handled: false,
      type: 'OpError',
    },
    {
      name: 'write tcp 10.36.0.21:3000->10.36.0.88:33926: write: broken pipe',
      occurrences: 2,
      culprit: 'apiHandlers.getOrders',
      groupId: '94f4ca8ec8c02e5318cf03f46ae4c1f3',
      lastSeen: 1634833121434,
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
  mainStatistics: [],
  serviceName: 'test service',
};
