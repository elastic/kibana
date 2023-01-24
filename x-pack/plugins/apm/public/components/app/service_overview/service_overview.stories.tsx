/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { Meta, Story } from '@storybook/react';
import React from 'react';
import { ServiceOverview } from '.';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import { APMServiceContextValue } from '../../../context/apm_service/apm_service_context';

const stories: Meta<{}> = {
  title: 'app/ServiceOverview',
  component: ServiceOverview,
  decorators: [
    (StoryComponent) => {
      const serviceName = 'testServiceName';
      const mockCore = {
        http: {
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
      } as unknown as CoreStart;
      const serviceContextValue = {
        serviceName,
      } as unknown as APMServiceContextValue;

      return (
        <MockApmPluginStorybook
          routePath="/services/${serviceName}/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now"
          serviceContextValue={serviceContextValue}
          apmContext={{ core: mockCore } as unknown as ApmPluginContextValue}
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
