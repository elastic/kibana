/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';

import { EuiErrorBoundary } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider as StyledComponentsThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import type { ExternalReferenceAttachmentTypeRegistry } from './client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from './client/attachment_framework/persistable_state_registry';
import type { RenderAppProps } from './types';

import { CasesApp } from './components/app';
import { useIsDarkTheme } from './common/use_is_dark_theme';

export const renderApp = (deps: RenderAppProps) => {
  const { mountParams } = deps;
  const { element } = mountParams;

  ReactDOM.render(<App deps={deps} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

interface CasesAppWithContextProps {
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  getFilesClient: (scope: string) => ScopedFilesClient;
}

const CasesAppWithContext: React.FC<CasesAppWithContextProps> = React.memo(
  ({
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    getFilesClient,
  }) => {
    const isDarkTheme = useIsDarkTheme();

    return (
      <StyledComponentsThemeProvider darkMode={isDarkTheme}>
        <CasesApp
          externalReferenceAttachmentTypeRegistry={externalReferenceAttachmentTypeRegistry}
          persistableStateAttachmentTypeRegistry={persistableStateAttachmentTypeRegistry}
          getFilesClient={getFilesClient}
        />
      </StyledComponentsThemeProvider>
    );
  }
);

CasesAppWithContext.displayName = 'CasesAppWithContext';

export const App: React.FC<{ deps: RenderAppProps }> = ({ deps }) => {
  const { mountParams, coreStart, pluginsStart, storage, kibanaVersion } = deps;
  const { history, theme$ } = mountParams;

  return (
    <EuiErrorBoundary>
      <I18nProvider>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{
              kibanaVersion,
              ...coreStart,
              ...pluginsStart,
              storage,
            }}
          >
            <Router history={history}>
              <CasesAppWithContext
                externalReferenceAttachmentTypeRegistry={
                  deps.externalReferenceAttachmentTypeRegistry
                }
                persistableStateAttachmentTypeRegistry={deps.persistableStateAttachmentTypeRegistry}
                getFilesClient={pluginsStart.files.filesClientFactory.asScoped}
              />
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nProvider>
    </EuiErrorBoundary>
  );
};

App.displayName = 'App';
