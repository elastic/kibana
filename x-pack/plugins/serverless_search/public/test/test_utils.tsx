/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';

import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { userProfileMock } from '@kbn/security-plugin/common/model/user_profile.mock';

export const core = coreMock.createStart();
export const services = {
  cloud: cloudMock.createStart(),
  share: sharePluginMock.createStartContract(),
  userProfile: userProfileMock.createWithSecurity(),
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { cacheTime: Infinity, retry: false },
  },
});

const AllTheProviders: React.FC = ({ children }) => {
  return (
    <KibanaThemeProvider theme$={core.theme.theme$}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>{children}</I18nProvider>
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};

const customRender = (ui: ReactElement, options: Omit<RenderOptions, 'wrapper'> = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
