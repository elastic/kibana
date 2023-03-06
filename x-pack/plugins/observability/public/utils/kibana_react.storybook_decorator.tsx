/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AppMountParameters } from '@kbn/core-application-browser';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { sloFeatureId } from '../../common';
import { PluginContext } from '../context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../rules/observability_rule_type_registry_mock';
import { ConfigSchema } from '../plugin';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const queryClient = new QueryClient();

  const appMountParameters = { setHeaderActionMenu: () => {} } as unknown as AppMountParameters;
  const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();

  const config: ConfigSchema = {
    unsafe: {
      slo: {
        enabled: false,
      },
      alertDetails: {
        apm: { enabled: false },
        logs: { enabled: false },
        metrics: { enabled: false },
        uptime: { enabled: false },
      },
    },
  };
  return (
    <KibanaContextProvider
      services={{
        application: {
          navigateToUrl: () => {},
          capabilities: {
            [sloFeatureId]: {
              read: true,
              write: true,
            },
          },
        },
        charts: {
          theme: {
            useChartsBaseTheme: () => {},
            useChartsTheme: () => {},
          },
        },
        data: {},
        dataViews: {
          create: () => Promise.resolve({}),
        },
        docLinks: {
          links: {
            query: {},
          },
        },
        http: {
          basePath: {
            prepend: (_: string) => '',
          },
        },
        notifications: {
          toasts: {
            addDanger: () => {},
          },
        },
        storage: {
          get: () => {},
        },
        uiSettings: {
          get: (setting: string) => {
            if (setting === 'dateFormat') {
              return 'MMM D, YYYY @ HH:mm:ss.SSS';
            }
          },
        },
        unifiedSearch: {},
      }}
    >
      <PluginContext.Provider
        value={{
          appMountParameters,
          config,
          observabilityRuleTypeRegistry,
          ObservabilityPageTemplate: KibanaPageTemplate,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      </PluginContext.Provider>
    </KibanaContextProvider>
  );
}
