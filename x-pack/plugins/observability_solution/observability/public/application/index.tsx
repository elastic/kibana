/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';
import { routes } from '../routes/routes';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { HideableReactQueryDevTools } from './hideable_react_query_dev_tools';
import { SharedProviders } from './shared_providers';

function App() {
  return (
    <>
      <Routes>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            return handler();
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Routes>
    </>
  );
}

export const renderApp = ({
  core,
  config,
  plugins,
  appMountParameters,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  usageCollection,
  isDev,
  kibanaVersion,
}: {
  core: CoreStart;
  config: ConfigSchema;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
  kibanaVersion: string;
}) => {
  const { element, history } = appMountParameters;

  core.chrome.setHelpExtension({
    appName: i18n.translate('xpack.observability.feedbackMenu.appName', {
      defaultMessage: 'Observability',
    }),
    links: [{ linkType: 'discuss', href: 'https://ela.st/observability-discuss' }],
  });

  // ensure all divs are .kbnAppWrappers
  element.classList.add(APP_WRAPPER_CLASS);

  const ApplicationUsageTrackingProvider =
    usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <SharedProviders
        isDev={Boolean(isDev)}
        kibanaVersion={kibanaVersion}
        pluginsStart={plugins}
        coreStart={core}
        config={config}
        ObservabilityPageTemplate={ObservabilityPageTemplate}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
        appMountParameters={appMountParameters}
      >
        <ApplicationUsageTrackingProvider>
          <Router history={history}>
            <RedirectAppLinks coreStart={core} data-test-subj="observabilityMainContainer">
              <App />
              <HideableReactQueryDevTools />
            </RedirectAppLinks>
          </Router>
        </ApplicationUsageTrackingProvider>
      </SharedProviders>
    </KibanaRenderContextProvider>,
    element
  );
  return () => {
    // This needs to be present to fix https://github.com/elastic/kibana/issues/155704
    // as the Overview page renders the UX Section component. That component renders a Lens embeddable
    // via the ExploratoryView app, which uses search sessions. Therefore on unmounting we need to clear
    // these sessions.
    plugins.data.search.session.clear();
    ReactDOM.unmountComponentAtNode(element);
  };
};
