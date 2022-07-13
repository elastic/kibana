/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { AppMountParameters, APP_WRAPPER_CLASS, CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { LazyObservabilityPageTemplateProps } from '../components/shared/page_template/lazy_page_template';
import { DatePickerContextProvider } from '../context/date_picker_context';
import { HasDataContextProvider } from '../context/has_data_context';
import { PluginContext } from '../context/plugin_context';
import { useRouteParams } from '../hooks/use_route_params';
import { ObservabilityPublicPluginsStart } from '../plugin';
import { routes } from '../routes';
import { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';

function App() {
  return (
    <>
      <Switch>
        {Object.keys(routes).map((key) => {
          const path = key as keyof typeof routes;
          const { handler, exact } = routes[path];
          const Wrapper = () => {
            const params = useRouteParams(path);
            return handler(params);
          };
          return <Route key={path} path={path} exact={exact} component={Wrapper} />;
        })}
      </Switch>
    </>
  );
}

export const renderApp = ({
  core,
  plugins,
  appMountParameters,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  kibanaFeatures,
  usageCollection,
  isDev,
}: {
  core: CoreStart;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  kibanaFeatures: KibanaFeature[];
  usageCollection: UsageCollectionSetup;
  isDev?: boolean;
}) => {
  const { element, history, theme$ } = appMountParameters;
  const i18nCore = core.i18n;
  const isDarkMode = core.uiSettings.get('theme:darkMode');

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
    <ApplicationUsageTrackingProvider>
      <KibanaThemeProvider theme$={theme$}>
        <KibanaContextProvider
          services={{ ...core, ...plugins, storage: new Storage(localStorage), isDev }}
        >
          <PluginContext.Provider
            value={{
              appMountParameters,
              observabilityRuleTypeRegistry,
              ObservabilityPageTemplate,
              kibanaFeatures,
            }}
          >
            <Router history={history}>
              <EuiThemeProvider darkMode={isDarkMode}>
                <i18nCore.Context>
                  <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
                    <DatePickerContextProvider>
                      <HasDataContextProvider>
                        <App />
                      </HasDataContextProvider>
                    </DatePickerContextProvider>
                  </RedirectAppLinks>
                </i18nCore.Context>
              </EuiThemeProvider>
            </Router>
          </PluginContext.Provider>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </ApplicationUsageTrackingProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
