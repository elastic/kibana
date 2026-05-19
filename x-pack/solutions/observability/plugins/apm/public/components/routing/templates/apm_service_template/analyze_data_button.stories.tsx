/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj, Meta } from '@storybook/react';
import React from 'react';
import { AnalyzeDataButton } from './analyze_data_button';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

interface Args {
  agentName?: string;
  canShowDashboard?: boolean;
  environment?: string;
}

export default {
  title: 'routing/templates/ApmServiceTemplate/AnalyzeDataButton',
  component: AnalyzeDataButton,
  parameters: {
    routePath:
      '/services/testServiceName/overview?rangeFrom=now-15m&rangeTo=now&environment=testEnvironment&kuery=',
    serviceContextValue: {
      agentName: 'iOS/swift',
      serviceName: 'testServiceName',
      transactionTypeStatus: FETCH_STATUS.SUCCESS,
      transactionTypes: [],
      fallbackToTransactions: false,
      serviceAgentStatus: FETCH_STATUS.SUCCESS,
    },
  },
} as Meta<Args>;

export const Example: StoryObj<Args> = {
  render: () => {
    return <AnalyzeDataButton />;
  },
};
