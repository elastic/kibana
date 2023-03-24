/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { RenderOptions, RenderResult } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';

import { render as reactRender } from '@testing-library/react';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

export interface AppMockRenderer {
  render: UiRender;
}

export const createAppMockRenderer = (): AppMockRenderer => {
  const theme$ = of({ darkMode: false });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>{children}</KibanaThemeProvider>
    </I18nProvider>
  );
  AppWrapper.displayName = 'AppWrapper';
  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };
  return {
    render,
  };
};
