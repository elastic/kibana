/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import { cloneDeep, merge } from 'lodash';
import React, { ComponentType } from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { TransactionDurationAlertTrigger } from '.';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../context/apm_service/apm_service_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';

export default {
  title: 'alerting/TransactionDurationAlertTrigger',
  component: TransactionDurationAlertTrigger,
  decorators: [
    (StoryComponent: ComponentType) => {
      const contextMock = (merge(cloneDeep(mockApmPluginContextValue), {
        core: {
          http: {
            get: (endpoint: string) => {
              if (endpoint === '/api/apm/environments') {
                return Promise.resolve({ environments: ['production'] });
              } else {
                return Promise.resolve({
                  transactionTypes: ['request'],
                });
              }
            },
          },
        },
      }) as unknown) as ApmPluginContextValue;

      return (
        <div style={{ width: 400 }}>
          <MemoryRouter initialEntries={['/services/test-service-name']}>
            <Route path="/services/:serviceName">
              <MockApmPluginContextWrapper value={contextMock}>
                <MockUrlParamsContextProvider>
                  <ApmServiceContextProvider>
                    <StoryComponent />
                  </ApmServiceContextProvider>
                </MockUrlParamsContextProvider>
              </MockApmPluginContextWrapper>
            </Route>
          </MemoryRouter>
        </div>
      );
    },
  ],
};

export const Example: Story = () => {
  const params = {
    threshold: 1500,
    aggregationType: 'avg' as const,
    window: '5m',
  };
  return (
    <TransactionDurationAlertTrigger
      alertParams={params as any}
      setAlertParams={() => undefined}
      setAlertProperty={() => undefined}
    />
  );
};
