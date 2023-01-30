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
        charts: {
          theme: {
            useChartsTheme: () => {},
            useChartsBaseTheme: () => {},
          },
        },
        application: { navigateToUrl: () => {} },
        http: { basePath: { prepend: (_: string) => '' } },
        docLinks: { links: { query: {} } },
        notifications: { toasts: {} },
        storage: { get: () => {} },
        uiSettings: {
          get: (setting: string) => {
            if (setting === 'dateFormat') {
              return 'MMM D, YYYY @ HH:mm:ss.SSS';
            }
          },
        },
      }}
    >
      <Story />
    </KibanaContextProvider>
  );
}
