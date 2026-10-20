/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryObj, Meta, Decorator } from '@storybook/react';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { AnalyzeDataButton } from './analyze_data_button';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

interface Args {
  agentName?: string;
  canShowDashboard?: boolean;
  environment?: string;
  serviceName?: string;
}

const argsDecorator: Decorator<Args> = (Story, { args }) => {
  const {
    agentName = 'iOS/swift',
    canShowDashboard = true,
    environment = 'testEnvironment',
    serviceName = 'testServiceName',
  } = args;

  // Lazy require keeps the route tree out of the module graph until after each
  // test file's hoisted `jest.mock()` calls have registered. See jest_preview.tsx.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { apmRouter } = require('../../apm_route_config');

  const routePath = `/services/${serviceName}/overview?rangeFrom=now-15m&rangeTo=now&environment=${
    environment ?? ENVIRONMENT_ALL.value
  }&kuery=`;

  const apmContext = {
    core: {
      application: {
        capabilities: { dashboard_v2: { show: canShowDashboard } },
      },
      http: { basePath: { get: () => '' } },
    },
  } as unknown as ApmPluginContextValue;

  const serviceContextValue = {
    agentName,
    serviceName,
    transactionTypeStatus: FETCH_STATUS.SUCCESS,
    transactionTypes: [],
    fallbackToTransactions: false,
    serviceAgentStatus: FETCH_STATUS.SUCCESS,
  };

  return (
    <MockApmPluginStorybook
      routePath={routePath}
      apmContext={apmContext}
      serviceContextValue={serviceContextValue}
      router={apmRouter}
    >
      <Story />
    </MockApmPluginStorybook>
  );
};

export default {
  title: 'routing/templates/ApmServiceTemplate/AnalyzeDataButton',
  component: AnalyzeDataButton,
  decorators: [argsDecorator],
  // This story builds its own providers from `args`; opt out of the global jest decorator
  // (jest_preview.tsx) so we don't nest <Router>s.
  parameters: { skipApmJestDecorator: true },
} as Meta<Args>;

export const Example: StoryObj<Args> = {
  render: () => <AnalyzeDataButton />,
  args: {
    agentName: 'iOS/swift',
    canShowDashboard: true,
    environment: 'testEnvironment',
    serviceName: 'testServiceName',
  },
};
