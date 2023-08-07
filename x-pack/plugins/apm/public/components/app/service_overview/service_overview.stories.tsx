/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { ServiceOverview } from '.';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import { APMServiceContextValue } from '../../../context/apm_service/apm_service_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { mockApmApiCallResponse } from '../../../services/rest/call_apm_api_spy';

const stories: Meta<{}> = {
  title: 'app/ServiceOverview',
  component: ServiceOverview,
  decorators: [
    (StoryComponent) => {
      const serviceName = 'testServiceName';
      const transactionType = 'type';
      const transactionTypeStatus = FETCH_STATUS.SUCCESS;

      mockApmApiCallResponse(
        `GET /api/apm/services/{serviceName}/annotation/search 2023-10-31`,
        () => ({ annotations: [] })
      );
      mockApmApiCallResponse(
        `GET /internal/apm/fallback_to_transactions`,
        () => ({ fallbackToTransactions: false })
      );
      mockApmApiCallResponse(
        `GET /internal/apm/services/{serviceName}/dependencies`,
        () => ({ serviceDependencies: [] })
      );

      const serviceContextValue = {
        serviceName,
        transactionType,
        transactionTypeStatus,
      } as unknown as APMServiceContextValue;

      return (
        <MockApmPluginStorybook
          routePath="/services/${serviceName}/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now"
          serviceContextValue={serviceContextValue}
        >
          <StoryComponent />
        </MockApmPluginStorybook>
      );
    },
  ],
};
export default stories;

export const Example: Story<{}> = () => {
  return <ServiceOverview />;
};
