/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import type { CoreStart } from '../../../../../../../src/core/public';
import {
  APMServiceContext,
  APMServiceContextValue,
} from '../../../context/apm_service/apm_service_context';
import { MockContextValue } from '../../../context/mock_apm_app/mock_apm_app_context';
import { ServiceOverview } from './';

const serviceName = 'testServiceName';
const mockCore = {
  http: {
    basePath: { prepend: () => {} },
    get: (endpoint: string) => {
      switch (endpoint) {
        case `/api/apm/services/${serviceName}/annotation/search`:
          return { annotations: [] };
        case '/internal/apm/fallback_to_transactions':
          return { fallbackToTransactions: false };
        case `/internal/apm/services/${serviceName}/dependencies`:
          return { serviceDependencies: [] };
        default:
          return {};
      }
    },
  },
  notifications: { toasts: { add: () => {} } },
  uiSettings: { get: () => 'Browser' },
} as unknown as CoreStart;
const serviceContextValue = {
  alerts: [],
  serviceName,
} as unknown as APMServiceContextValue;

type Args = MockContextValue;

const stories: Meta<{}> = {
  title: 'app/ServiceOverview',
  component: ServiceOverview,
  args: {
    coreStart: mockCore,
    path: `/services/${serviceName}/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now`,
  },
  decorators: [
    (StoryComponent) => {
      return (
        <APMServiceContext.Provider value={serviceContextValue}>
          <StoryComponent />
        </APMServiceContext.Provider>
      );
    },
  ],
};
export default stories;

export const Example: Story<Args> = () => {
  return <ServiceOverview />;
};
