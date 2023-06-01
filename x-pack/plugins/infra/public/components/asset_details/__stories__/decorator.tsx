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
import { getLazyOsqueryAction } from '@kbn/osquery-plugin/public/shared_components';
import type { ApplicationStart } from '@kbn/core/public';
import type { IKibanaSearchRequest, ISearchOptions } from '@kbn/data-plugin/public';
import { useGlobalStorybookTheme } from '../../../test_utils/use_global_storybook_theme';
import type { PluginKibanaContextValue } from '../../../hooks/use_kibana';
import { SourceProvider } from '../../../containers/metrics_source';
import { getHttp } from './context/http';
import { getLogEntries } from './context/fixtures/log_entries';

const settings: Record<string, any> = {
  'dateFormat:scaled': [['', 'HH:mm:ss.SSS']],
};
const getSettings = (key: string): any => settings[key];

const getApplication = (): DeepPartial<ApplicationStart> => ({
  currentAppId$: of('infra'),
  navigateToUrl: async (url: string) => {
    action(`Navigate to: ${url}`);
  },
  getUrlForApp: (url: string) => url,
  capabilities: {
    osquery: {
      runSavedQueries: true,
      readSavedQueries: true,
      writeLiveQueries: true,
    },
  },
});

export const DecorateWithKibanaContext: DecoratorFn = (story, context) => {
  const initialProcesses = useParameter<{ mock: string }>('apiResponse', {
    mock: 'default',
  })!;

  const { theme$ } = useGlobalStorybookTheme(context);
  const mockServices: DeepPartial<KibanaReactContextValue<PluginKibanaContextValue>['services']> = {
    application: getApplication(),
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
    osquery: {
      OsqueryAction: getLazyOsqueryAction({
        application: getApplication(),
        theme: {
          theme$,
        },
      } as any),
    },
    http: getHttp(initialProcesses),
    share: {
      url: {
        locators: {
          get: (_id: string) =>
            ({
              navigate: async (params: any) => {
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
