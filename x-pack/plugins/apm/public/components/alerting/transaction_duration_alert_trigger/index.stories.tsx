/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, merge } from 'lodash';
import React, { ComponentType } from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import { TransactionDurationAlertTrigger } from '.';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';

export default {
  title: 'app/TransactionDurationAlertTrigger',
  component: TransactionDurationAlertTrigger,
  decorators: [
    (Story: ComponentType) => {
      const contextMock = (merge(cloneDeep(mockApmPluginContextValue), {
        core: {
          http: {
            get: (endpoint: string) => {
              if (endpoint === '/api/apm/ui_filters/environments') {
                return Promise.resolve(['production']);
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
          <MemoryRouter initialEntries={['/transactions/test-service-name']}>
            <Route path="/transactions/:serviceName">
              <MockApmPluginContextWrapper value={contextMock}>
                <MockUrlParamsContextProvider>
                  <Story />
                </MockUrlParamsContextProvider>
              </MockApmPluginContextWrapper>
            </Route>
          </MemoryRouter>
        </div>
      );
    },
  ],
};

export function Example() {
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
}
