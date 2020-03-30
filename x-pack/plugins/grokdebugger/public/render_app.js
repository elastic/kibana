/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { GrokDebugger } from './components/grok_debugger';
import { GrokdebuggerService } from './services/grokdebugger/grokdebugger_service';
import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
import { InactiveLicenseSlate } from './components/inactive_license';

export function renderApp(license, element, coreStart) {
  if (!license.isActive) {
    render(
      <I18nProvider>
        <InactiveLicenseSlate license={license} />
      </I18nProvider>,
      element
    );
    return () => unmountComponentAtNode(element);
  } else {
    render(
      <KibanaContextProvider services={{ ...coreStart }}>
        <I18nProvider>
          <GrokDebugger grokdebuggerService={new GrokdebuggerService(coreStart.http)} />
        </I18nProvider>
      </KibanaContextProvider>,
      element
    );
    return () => unmountComponentAtNode(element);
  }
}
