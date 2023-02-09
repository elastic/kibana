/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  return (
    <KibanaContextProvider
      services={{
        application: {
          navigateToUrl: () => {},
        },
        charts: {
          theme: {
            useChartsBaseTheme: () => {},
            useChartsTheme: () => {},
          },
        },
        data: {},
        dataViews: {
          create: () => {},
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
          toasts: {},
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
      <Story />
    </KibanaContextProvider>
  );
}
