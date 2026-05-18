/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Decorator } from '@storybook/react';
import * as jest from 'jest-mock';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { PerformanceContext } from '@kbn/ebt-tools';
import { createMemoryHistory } from 'history';
import { merge } from 'lodash';
import {
  mockApmPluginContext,
  storybookTelemetry,
} from '../public/context/apm_plugin/mock_apm_plugin_storybook';
import { apmRouter } from '../public/components/routing/apm_route_config';
import { createCallApmApi } from '../public/services/rest/create_call_apm_api';
import { ApmPluginContext } from '../public/context/apm_plugin/apm_plugin_context';
import { APMServiceContext } from '../public/context/apm_service/apm_service_context';
import { MockTimeRangeContextProvider } from '../public/context/time_range_metadata/mock_time_range_metadata_context_provider';
import { ApmTimeRangeMetadataContextProvider } from '../public/context/time_range_metadata/time_range_metadata_context';
import { ChartPointerEventContextProvider } from '../public/context/chart_pointer_event/chart_pointer_event_context';

(window as any).jest = jest;

const mockPerformanceApi = {
  onPageReady: () => {},
  onPageRefreshStart: () => {},
};

const ApmDecorator: Decorator = (Story, context) => {
  const routePath = context.parameters.routePath || '/services/?rangeFrom=now-15m&rangeTo=now';
  const apmContextOverride = context.parameters.apmContext || {};
  const serviceContextValue = context.parameters.serviceContextValue || {};

  const contextMock = merge({}, mockApmPluginContext, apmContextOverride);
  createCallApmApi(contextMock.core);

  const KibanaReactContext = createKibanaReactContext(
    merge({}, contextMock.core, {
      telemetry: storybookTelemetry,
      securityService: {
        authc: {
          getCurrentUser: async () => ({
            username: 'storybook_user',
            roles: ['superuser'],
            enabled: true,
            authentication_realm: { name: 'native', type: 'native' },
            lookup_realm: { name: 'native', type: 'native' },
            authentication_provider: { type: 'basic', name: 'basic' },
          }),
        },
      },
      triggersActionsUi: {
        ruleTypeRegistry: { has: () => false, get: () => null, list: () => [] },
        actionTypeRegistry: { has: () => false, get: () => null, list: () => [] },
      },
    })
  );

  const history = createMemoryHistory({
    initialEntries: [routePath],
  });

  return (
    <IntlProvider locale="en">
      <EuiThemeProvider darkMode={false}>
        <KibanaReactContext.Provider>
          <ApmPluginContext.Provider value={contextMock}>
            <PerformanceContext.Provider value={mockPerformanceApi}>
              <APMServiceContext.Provider value={serviceContextValue}>
                <RouterProvider router={apmRouter} history={history}>
                  <MockTimeRangeContextProvider>
                    <ApmTimeRangeMetadataContextProvider>
                      <ChartPointerEventContextProvider>
                        <Story />
                      </ChartPointerEventContextProvider>
                    </ApmTimeRangeMetadataContextProvider>
                  </MockTimeRangeContextProvider>
                </RouterProvider>
              </APMServiceContext.Provider>
            </PerformanceContext.Provider>
          </ApmPluginContext.Provider>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    </IntlProvider>
  );
};

export const decorators = [ApmDecorator];
