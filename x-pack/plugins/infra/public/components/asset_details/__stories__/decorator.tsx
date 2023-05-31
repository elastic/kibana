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
import { DeepPartial } from 'utility-types';
import { LocatorPublic } from '@kbn/share-plugin/public';
import { getLazyOsqueryAction } from '@kbn/osquery-plugin/public/shared_components';
import { useGlobalStorybookTheme } from '../../../test_utils/use_global_storybook_theme';
import type { PluginKibanaContextValue } from '../../../hooks/use_kibana';
import { SourceProvider } from '../../../containers/metrics_source';
import { getHttp } from './context/http';
import { ProcessesHttpMocks } from './context/fixtures/processes';
import { MetadataResponseMocks } from './context/fixtures/metadata';

export const DecorateWithKibanaContext: DecoratorFn = (story, context) => {
  const initialProcesses = useParameter<{ mock: ProcessesHttpMocks | MetadataResponseMocks }>(
    'apiResponse',
    {
      mock: 'default',
    }
  )!;

  const { theme$ } = useGlobalStorybookTheme(context);
  const mockServices: DeepPartial<KibanaReactContextValue<PluginKibanaContextValue>['services']> = {
    application: {
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
    },
    data: {
      query: {
        filterManager: {
          addFilters: () => action(`addFilters`),
          removeFilter: () => action(`removeFilter`),
        },
      },
    },
    notifications: {
      toasts: {
        add: () => {
          action('toast');
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
              navigate: async () =>
                Promise.resolve(() => {
                  action(
                    'https://kibana:8080/base-path/app/uptime/?search=host.name: "host1" OR host.ip: "192.168.0.1" OR monitor.ip: "192.168.0.1"'
                  );
                }),
            } as unknown as LocatorPublic<any>),
        },
      },
    },
  };

  const osquery = {
    OsqueryAction: getLazyOsqueryAction({
      application: mockServices.application,
      theme: {
        theme$,
      },
    } as any),
  };

  return (
    <I18nProvider>
      <KibanaContextProvider services={{ ...mockServices, osquery }}>
        <SourceProvider sourceId="default">{story()}</SourceProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

// elasticsearch: {
//   indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
// },
