/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StoryObj, Meta } from '@storybook/react';
import type { ComponentProps } from 'react';
import React from 'react';
import { ErrorGroupList } from '.';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { mockApmApiCallResponse } from '../../../../services/rest/storybook_mock_http';

type Args = ComponentProps<typeof ErrorGroupList>;

const errorGroups = [
  {
    name: 'net/http: abort Handler',
    occurrences: 14,
    culprit: 'Main.func2',
    groupId: '83a653297ec29afed264d7b60d5cda7b',
    lastSeen: 1634833121434,
    handled: false,
    type: 'errorString',
    traceId: 'abc123',
  },
  {
    name: 'POST /api/orders (500)',
    occurrences: 5,
    culprit: 'logrusMiddleware',
    groupId: '7a640436a9be648fd708703d1ac84650',
    lastSeen: 1634833121434,
    handled: false,
    type: 'OpError',
    traceId: 'def456',
  },
  {
    name: 'write tcp 10.36.2.24:3000->10.36.1.14:34232: write: connection reset by peer',
    occurrences: 4,
    culprit: 'apiHandlers.getProductCustomers',
    groupId: '95ca0e312c109aa11e298bcf07f1445b',
    lastSeen: 1634833121434,
    handled: false,
    type: 'OpError',
    traceId: 'ghi789',
  },
  {
    name: 'write tcp 10.36.0.21:3000->10.36.1.252:57070: write: connection reset by peer',
    occurrences: 3,
    culprit: 'apiHandlers.getCustomers',
    groupId: '4053d7e33d2b716c819bd96d9d6121a2',
    lastSeen: 1634833121434,
    handled: false,
    type: 'OpError',
    traceId: 'jkl012',
  },
  {
    name: 'write tcp 10.36.0.21:3000->10.36.0.88:33926: write: broken pipe',
    occurrences: 2,
    culprit: 'apiHandlers.getOrders',
    groupId: '94f4ca8ec8c02e5318cf03f46ae4c1f3',
    lastSeen: 1634833121434,
    handled: false,
    type: 'OpError',
    traceId: 'mno345',
  },
];

const stories: Meta<Args> = {
  title: 'app/ErrorGroupOverview/ErrorGroupList',
  component: ErrorGroupList,
  parameters: {
    routePath:
      '/services/testService/errors?environment=ENVIRONMENT_ALL&kuery=&rangeFrom=now-15m&rangeTo=now',
    serviceContextValue: {
      serviceName: 'testService',
      fallbackToTransactions: false,
      transactionTypeStatus: FETCH_STATUS.SUCCESS,
      transactionTypes: ['request'],
      serviceAgentStatus: FETCH_STATUS.SUCCESS,
    },
  },
};
export default stories;

export const Example: StoryObj<Args> = {
  render: (args) => {
    return <ErrorGroupList {...args} />;
  },

  args: {
    serviceName: 'testService',
    initialPageSize: 5,
  },

  decorators: [
    (StoryComponent) => {
      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
        () => ({
          errorGroups,
          maxCountExceeded: false,
        })
      );

      const now = Date.now();
      const makeTimeseries = (baseValue: number) =>
        Array.from({ length: 20 }, (_, i) => ({
          x: now - (20 - i) * 60000,
          y: baseValue * (0.8 + Math.random() * 0.4),
        }));

      const currentPeriod: Record<string, any> = {};
      errorGroups.forEach((group) => {
        currentPeriod[group.groupId] = { timeseries: makeTimeseries(group.occurrences) };
      });

      mockApmApiCallResponse(
        'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
        () => ({
          currentPeriod,
          previousPeriod: {},
        })
      );

      return <StoryComponent />;
    },
  ],
};

export const EmptyState: StoryObj<Args> = {
  render: (args) => {
    return <ErrorGroupList {...args} />;
  },

  args: {
    serviceName: 'testService',
    initialPageSize: 5,
  },

  decorators: [
    (StoryComponent) => {
      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
        () => ({
          errorGroups: [],
          maxCountExceeded: false,
        })
      );

      mockApmApiCallResponse(
        'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
        () => ({
          currentPeriod: {},
          previousPeriod: {},
        })
      );

      return <StoryComponent />;
    },
  ],
};
