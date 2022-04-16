/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import {
  APMServiceContext,
  APMServiceContextValue,
} from '../../../context/apm_service/apm_service_context';
import { ServiceOverview } from '.';

const stories: Meta<{}> = {
  title: 'app/ServiceOverview',
  component: ServiceOverview,
  decorators: [
    (StoryComponent) => {
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
        serviceName,
      } as unknown as APMServiceContextValue;
      const KibanaReactContext = createKibanaReactContext(mockCore);

      return (
        <MemoryRouter
          initialEntries={[
            `/services/${serviceName}/overview?environment=ENVIRONMENT_ALL&rangeFrom=now-15m&rangeTo=now`,
          ]}
        >
          <KibanaReactContext.Provider>
            <MockApmPluginContextWrapper
              value={{ core: mockCore } as ApmPluginContextValue}
            >
              <APMServiceContext.Provider value={serviceContextValue}>
                <StoryComponent />
              </APMServiceContext.Provider>
            </MockApmPluginContextWrapper>
          </KibanaReactContext.Provider>
        </MemoryRouter>
      );
    },
  ],
};
export default stories;

export const Example: Story<{}> = () => {
  return <ServiceOverview />;
};
