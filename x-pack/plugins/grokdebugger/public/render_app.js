/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { GrokDebugger } from './components/grok_debugger';
import { InactiveLicenseSlate } from './components/inactive_license';
import { GrokdebuggerService } from './services/grokdebugger/grokdebugger_service';
import { KibanaContextProvider, KibanaRenderContextProvider } from './shared_imports';

export function renderApp(license, element, coreStart, theme$) {
  const content = license.isActive ? (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...coreStart }}>
        <GrokDebugger grokdebuggerService={new GrokdebuggerService(coreStart.http)} />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  ) : (
    <KibanaRenderContextProvider theme$={theme$}>
      <InactiveLicenseSlate license={license} />
    </KibanaRenderContextProvider>
  );

  render(content, element);

  return () => unmountComponentAtNode(element);
}
