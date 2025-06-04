/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { FocusedTraceWaterfall } from '.';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';

type TraceItems = APIReturnType<'GET /internal/apm/traces/{traceId}/{docId}'>;

const stories: Meta<any> = {
  title: 'app/TransactionDetails/focusedTraceWaterfall',
  component: FocusedTraceWaterfall,
  decorators: [
    (StoryComponent) => (
      <MockApmPluginStorybook routePath="/services/{serviceName}/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=testTransactionName">
        <StoryComponent />
      </MockApmPluginStorybook>
    ),
  ],
};
export default stories;

export const Example: StoryFn<any> = () => {
  return <FocusedTraceWaterfall items={data} />;
};

const data: TraceItems = {
  traceItems: {
    rootDoc: {
      id: 'foo',
      timestamp: '2025-05-21T18:35:26.179Z',
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 599997781083,
      hasError: false,
      serviceName: 'recommendation',
    },

    focusedTraceDoc: {
      id: 'foo',
      timestamp: '2025-05-21T18:35:26.179Z',
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 599997781083,
      hasError: false,
      serviceName: 'recommendation',
    },
    focusedTraceTree: [
      {
        traceDoc: {
          id: '41b4177551ba7b6d',
          timestamp: '2025-05-21T18:35:26.179Z',
          name: 'child',
          traceId: '01d9ebaca760279d6d68d29ea5283c58',
          duration: 600003407022,
          hasError: false,
          parentId: 'foo',
          serviceName: 'flagd',
        },
        children: [],
      },
    ],
  },
  summary: { services: 2, traceEvents: 2, errors: 0 },
};
