/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';

import { KibanaContextProvider, KibanaThemeProvider } from './shared_imports';
import { GrokDebugger } from './components/grok_debugger';
import { GrokdebuggerService } from './services/grokdebugger/grokdebugger_service';
import { InactiveLicenseSlate } from './components/inactive_license';

export function renderApp(license, element, coreStart, theme$) {
  const content = license.isActive ? (
    <KibanaContextProvider services={{ ...coreStart }}>
      <I18nProvider>
        <KibanaThemeProvider theme$={theme$}>
          <GrokDebugger grokdebuggerService={new GrokdebuggerService(coreStart.http)} />
        </KibanaThemeProvider>
      </I18nProvider>
    </KibanaContextProvider>
  ) : (
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <InactiveLicenseSlate license={license} />
      </KibanaThemeProvider>
    </I18nProvider>
  );

  render(content, element);

  return () => unmountComponentAtNode(element);
}
