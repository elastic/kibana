/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { from } from 'rxjs';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import translations from '@kbn/translations-plugin/translations/ja-JP.json';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { AppMountParameters } from '@kbn/core-application-browser';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { sloFeatureId } from '../../common';
import { UI_SETTINGS } from '../hooks/use_kibana_ui_settings';
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
    <IntlProvider locale="en-US" messages={translations.messages}>
      <MemoryRouter>
        <KibanaContextProvider
          services={{
            application: {
              capabilities: {
                [sloFeatureId]: {
                  read: true,
                  write: true,
                },
              },
              getUrlForApp: () => {},
              navigateToUrl: () => {},
            },
            cases: {
              helpers: {
                getUICapabilities: () => ({
                  all: true,
                  create: true,
                  read: true,
                  update: true,
                  delete: true,
                  push: true,
                }),
              },
              ui: { getCasesContext: () => {} },
            },
            charts: {
              theme: {
                useChartsBaseTheme: () => {},
                useChartsTheme: () => {},
              },
            },
            chrome: {
              docTitle: '',
              setBreadcrumbs: () => {},
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
              get: (key: string) => {
                const euiSettings = {
                  dateForm: 'MMM D, YYYY @ HH:mm:ss.SSS',
                  [UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS]: {
                    from: 'now-15m',
                    to: 'now',
                  },
                  [UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS]: {
                    pause: true,
                    value: 1000,
                  },
                  [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: [
                    {
                      from: 'now/d',
                      to: 'now/d',
                      display: 'Today',
                    },
                    {
                      from: 'now/w',
                      to: 'now/w',
                      display: 'This week',
                    },
                    {
                      from: 'now-15m',
                      to: 'now',
                      display: 'Last 15 minutes',
                    },
                    {
                      from: 'now-30m',
                      to: 'now',
                      display: 'Last 30 minutes',
                    },
                    {
                      from: 'now-1h',
                      to: 'now',
                      display: 'Last 1 hour',
                    },
                    {
                      from: 'now-24h',
                      to: 'now',
                      display: 'Last 24 hours',
                    },
                    {
                      from: 'now-7d',
                      to: 'now',
                      display: 'Last 7 days',
                    },
                    {
                      from: 'now-30d',
                      to: 'now',
                      display: 'Last 30 days',
                    },
                    {
                      from: 'now-90d',
                      to: 'now',
                      display: 'Last 90 days',
                    },
                    {
                      from: 'now-1y',
                      to: 'now',
                      display: 'Last 1 year',
                    },
                  ],
                };
                // @ts-expect-error
                return euiSettings[key];
              },
            },
            theme: {
              theme$: from([{ darkMode: false }]),
            },
            triggersActionsUi: {
              alertsTableConfigurationRegistry: () => {},
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
            <EuiThemeProvider>
              <QueryClientProvider client={queryClient}>
                <Story />
              </QueryClientProvider>
            </EuiThemeProvider>
          </PluginContext.Provider>
        </KibanaContextProvider>
      </MemoryRouter>
    </IntlProvider>
  );
}
