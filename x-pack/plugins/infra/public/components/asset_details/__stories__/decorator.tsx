/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  KibanaContextProvider,
  type KibanaReactContextValue,
} from '@kbn/kibana-react-plugin/public';
import { of } from 'rxjs';
import { action } from '@storybook/addon-actions';
import type { DecoratorFn } from '@storybook/react';
import { useParameter } from '@storybook/addons';
import type { DeepPartial } from 'utility-types';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/data-plugin/public';
import type { PluginKibanaContextValue } from '../../../hooks/use_kibana';
import { SourceProvider } from '../../../containers/metrics_source';
import { getHttp } from './context/http';
import { getLogEntries } from './context/fixtures';

const settings: Record<string, any> = {
  'dateFormat:scaled': [['', 'HH:mm:ss.SSS']],
};
const getSettings = (key: string): any => settings[key];

export const DecorateWithKibanaContext: DecoratorFn = (story) => {
  const initialProcesses = useParameter<{ mock: string }>('apiResponse', {
    mock: 'default',
  })!;

  const mockServices: DeepPartial<KibanaReactContextValue<PluginKibanaContextValue>['services']> = {
    application: {
      currentAppId$: of('infra'),
      navigateToUrl: async (url: string) => {
        action(`Navigate to: ${url}`);
      },
      getUrlForApp: (url: string) => url,
    },
    data: {
      search: {
        search: (request: IKibanaSearchRequest, options?: ISearchOptions) => {
          return getLogEntries(request, options) as any;
        },
      },
      query: {
        filterManager: {
          addFilters: () => {},
          removeFilter: () => {},
        },
      },
    },
    locators: {
      nodeLogsLocator: {
        getRedirectUrl: () => {
          return '';
        },
      },
    },
    uiActions: {
      getTriggerCompatibleActions: () => {
        return Promise.resolve([]);
      },
    },
    settings: {
      client: {
        get$: (key: string) => of(getSettings(key)),
        get: getSettings,
      },
    },
    notifications: {
      toasts: {
        add: (params) => {
          action('notifications.toats.add')(params);
          return { id: 'id' };
        },
      },
    },
    http: getHttp(initialProcesses),
    share: {
      url: {
        locators: {
          get: (_id: string) =>
            ({
              navigate: async () => {
                return Promise.resolve();
              },
            } as unknown as LocatorPublic<any>),
        },
      },
    },
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>
        <SourceProvider sourceId="default">{story()}</SourceProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
