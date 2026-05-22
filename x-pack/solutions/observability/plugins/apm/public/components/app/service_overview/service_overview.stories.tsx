/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { ServiceOverview } from '.';
import type { APMServiceContextValue } from '../../../context/apm_service/apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { mockApmApiCallResponse } from '../../../services/rest/storybook_mock_http';

const stories: Meta<{}> = {
  title: 'app/ServiceOverview',
  component: ServiceOverview,
  parameters: {
    routePath:
      '/services/testServiceName/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now',
    serviceContextValue: {
      serviceName: 'testServiceName',
      transactionType: 'type',
      transactionTypeStatus: FETCH_STATUS.SUCCESS,
      transactionTypes: ['type'],
    } as unknown as APMServiceContextValue,
  },
  decorators: [
    (StoryComponent) => {
      mockApmApiCallResponse(
        `GET /api/apm/services/{serviceName}/annotation/search 2023-10-31`,
        () => ({ annotations: [] })
      );
      mockApmApiCallResponse(`GET /internal/apm/fallback_to_transactions`, () => ({
        fallbackToTransactions: false,
      }));
      mockApmApiCallResponse(`GET /internal/apm/services/{serviceName}/dependencies`, () => ({
        serviceDependencies: [],
      }));

      return <StoryComponent />;
    },
  ],
};
export default stories;

export const Example: StoryFn<{}> = () => {
  return <ServiceOverview />;
};
