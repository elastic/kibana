/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj, Meta } from '@storybook/react';
import React from 'react';
import { LatencyChart } from '.';
import type { Props } from '.';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { mockApmApiCallResponse } from '../../../../services/rest/storybook_mock_http';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

function generateLatencyTimeseries() {
  const now = Date.now();
  const start = now - 15 * 60 * 1000;
  const bucketSize = 15000;
  const points = [];
  for (let t = start; t <= now; t += bucketSize) {
    points.push({ x: t, y: 3000 + Math.random() * 2000 });
  }
  return points;
}

interface Args extends Props {
  latencyChartResponse: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/latency'>;
}

const stories: Meta<Args> = {
  title: 'shared/charts/LatencyChart',
  component: LatencyChart,
  argTypes: {
    latencyChartResponse: {
      control: {
        type: 'object',
      },
    },
  },
  parameters: {
    routePath:
      '/services/testService/overview?environment=ENVIRONMENT_ALL&kuery=&serviceGroup=&rangeFrom=now-15m&rangeTo=now&transactionType=request&comparisonEnabled=false&offset=1d',
    serviceContextValue: {
      serviceName: 'testService',
      transactionType: 'request',
      transactionTypeStatus: FETCH_STATUS.SUCCESS,
      transactionTypes: [],
      fallbackToTransactions: false,
      serviceAgentStatus: FETCH_STATUS.SUCCESS,
    },
  },
  decorators: [
    (StoryComponent, { args }) => {
      const { latencyChartResponse } = args as Args;

      mockApmApiCallResponse(
        'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
        () => latencyChartResponse
      );

      return <StoryComponent />;
    },
  ],
};

export default stories;

const exampleLatencyTimeseries = generateLatencyTimeseries();

export const Example: StoryObj<Args> = {
  render: () => {
    return <LatencyChart height={300} kuery="" />;
  },

  args: {
    latencyChartResponse: {
      currentPeriod: {
        overallAvgDuration: 3912,
        latencyTimeseries: exampleLatencyTimeseries,
      },
      previousPeriod: { latencyTimeseries: [], overallAvgDuration: null },
    },
  },
};

export const NoData: StoryObj<Args> = {
  render: () => {
    return <LatencyChart height={300} kuery="" />;
  },

  args: {
    latencyChartResponse: {
      currentPeriod: { latencyTimeseries: [], overallAvgDuration: null },
      previousPeriod: { latencyTimeseries: [], overallAvgDuration: null },
    },
  },
};
