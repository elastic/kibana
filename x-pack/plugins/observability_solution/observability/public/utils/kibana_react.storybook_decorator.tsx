/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { of } from 'rxjs';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { AppMountParameters } from '@kbn/core-application-browser';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { CoreTheme } from '@kbn/core-theme-browser';
import { MemoryRouter } from 'react-router-dom';
import { casesFeatureId, sloFeatureId } from '@kbn/observability-shared-plugin/common';
import { PluginContext } from '../context/plugin_context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../rules/observability_rule_type_registry_mock';
import { ConfigSchema } from '../plugin';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const queryClient = new QueryClient();

  const appMountParameters = {
    setHeaderActionMenu: () => {},
  } as unknown as AppMountParameters;
  const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();

  const config: ConfigSchema = {
    unsafe: {
      alertDetails: {
        uptime: { enabled: false },
        observability: { enabled: false },
      },
    },
  };

  const mockTheme: CoreTheme = {
    darkMode: false,
  };

  const createTheme$Mock = () => {
    return of({ ...mockTheme });
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
            [casesFeatureId]: { read_cases: true },
          },
        },
        cases: {
          getAllCases: () => <>Get All Cases component from Cases app</>,
          helpers: { getUICapabilities: () => ({ read_cases: true }) },
          ui: {
            getCases: () => <>Get Cases component from Cases app</>,
          },
        },
        charts: {
          theme: {
            useChartsBaseTheme: () => {},
          },
          activeCursor: () => {},
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
        share: {
          url: { locators: { get: () => {} } },
        },
        storage: {
          get: () => {},
        },
        theme: {
          theme$: createTheme$Mock(),
        },
        triggersActionsUi: { getAddRuleFlyout: {} },
        uiSettings: {
          get: (setting: string) => {
            if (setting === 'dateFormat') {
              return 'MMM D, YYYY @ HH:mm:ss.SSS';
            }
            if (setting === 'format:percent:defaultPattern') {
              return '0,0.[000]%';
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
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <Story />
          </QueryClientProvider>
        </MemoryRouter>
      </PluginContext.Provider>
    </KibanaContextProvider>
  );
}
