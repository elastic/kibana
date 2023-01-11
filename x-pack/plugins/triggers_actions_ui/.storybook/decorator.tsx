/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import uuid from 'uuid';
import { action } from '@storybook/addon-actions';
import { DecoratorFn } from '@storybook/react';
import { EMPTY, of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { NotificationsStart, ApplicationStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KibanaContextProvider } from '../public/common/lib/kibana';
import { ExperimentalFeaturesService } from '../public/common/experimental_features_service';
import { getHttp } from './context/http';
import { getRuleTypeRegistry } from './context/rule_type_registry';
import { getActionTypeRegistry } from './context/action_type_registry';

interface StorybookContextDecoratorProps {
  context: Parameters<DecoratorFn>[1];
}

const queryClient = new QueryClient();

const handler = (type: string, ...rest: any[]) => {
  action(`${type} Toast`)(rest);
  return { id: uuid() };
};

const notifications: NotificationsStart = {
  toasts: {
    add: (params) => handler('add', params),
    addDanger: (params) => handler('danger', params),
    addError: (params) => handler('error', params),
    addWarning: (params) => handler('warning', params),
    addSuccess: (params) => handler('success', params),
    addInfo: (params) => handler('info', params),
    remove: () => {},
    get$: () => of([]),
  },
};

const applications = new Map();

const application: ApplicationStart = {
  currentAppId$: of('fleet'),
  navigateToUrl: async (url: string) => {
    action(`Navigate to: ${url}`);
  },
  navigateToApp: async (app: string) => {
    action(`Navigate to: ${app}`);
  },
  getUrlForApp: (url: string) => url,
  capabilities: {
    actions: {
      show: true,
      save: true,
      execute: true,
      delete: true,
    },
    catalogue: {},
    management: {},
    navLinks: {},
    fleet: {
      read: true,
      all: true,
    },
    fleetv2: {
      read: true,
      all: true,
    },
  },
  applications$: of(applications),
};

export const StorybookContextDecorator: React.FC<StorybookContextDecoratorProps> = (props) => {
  const { children, context } = props;
  const { globals } = context;
  const { euiTheme } = globals;

  const darkMode = ['v8.dark', 'v7.dark'].includes(euiTheme);
  ExperimentalFeaturesService.init({
    experimentalFeatures: {
      rulesListDatagrid: true,
      internalAlertsTable: true,
      ruleTagFilter: true,
      ruleStatusFilter: true,
      rulesDetailLogs: true,
      ruleUseExecutionStatus: false,
    },
  });
  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={darkMode}>
        <KibanaThemeProvider theme$={EMPTY}>
          <KibanaContextProvider
            services={{
              notifications,
              uiSettings: {
                get: () => {
                  if (context.componentId === 'app-ruleslist') {
                    return 'format:number:defaultPattern';
                  }
                },
                get$: () => {
                  if (context.componentId === 'app-ruleslist') {
                    return of('format:number:defaultPattern');
                  }
                },
              },
              application,
              http: getHttp(context),
              actionTypeRegistry: getActionTypeRegistry(),
              ruleTypeRegistry: getRuleTypeRegistry(),
            }}
          >
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </EuiThemeProvider>
    </I18nProvider>
  );
};
