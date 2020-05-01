/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloProvider } from 'react-apollo';
import { CoreStart, AppMountParameters } from 'kibana/public';

// TODO use theme provided from parentApp when kibana supports it
import { EuiErrorBoundary } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { EuiThemeProvider } from '../../../observability/public/typings/eui_styled_components';
import { InfraFrontendLibs } from '../lib/lib';
import { ApolloClientContext } from '../utils/apollo_context';
import { HistoryContext } from '../utils/history_context';
import {
  useUiSetting$,
  KibanaContextProvider,
} from '../../../../../src/plugins/kibana_react/public';
import { AppRouter } from '../routers';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';
import { TriggersActionsProvider } from '../utils/triggers_actions_context';
import '../index.scss';
import { NavigationWarningPromptProvider } from '../utils/navigation_warning_prompt';

export const CONTAINER_CLASSNAME = 'infra-container-element';

export async function startApp(
  libs: InfraFrontendLibs,
  core: CoreStart,
  plugins: object,
  params: AppMountParameters,
  Router: AppRouter,
  triggersActionsUI: TriggersAndActionsUIPublicPluginSetup
) {
  const { element, history } = params;

  const InfraPluginRoot: React.FunctionComponent = () => {
    const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

    return (
      <core.i18n.Context>
        <EuiErrorBoundary>
          <TriggersActionsProvider triggersActionsUI={triggersActionsUI}>
            <ApolloProvider client={libs.apolloClient}>
              <ApolloClientContext.Provider value={libs.apolloClient}>
                <EuiThemeProvider darkMode={darkMode}>
                  <HistoryContext.Provider value={history}>
                    <NavigationWarningPromptProvider>
                      <Router history={history} />
                    </NavigationWarningPromptProvider>
                  </HistoryContext.Provider>
                </EuiThemeProvider>
              </ApolloClientContext.Provider>
            </ApolloProvider>
          </TriggersActionsProvider>
        </EuiErrorBoundary>
      </core.i18n.Context>
    );
  };

  const App: React.FunctionComponent = () => (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <InfraPluginRoot />
    </KibanaContextProvider>
  );

  // Ensure the element we're handed from application mounting is assigned a class
  // for our index.scss styles to apply to.
  element.className += ` ${CONTAINER_CLASSNAME}`;

  ReactDOM.render(<App />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
