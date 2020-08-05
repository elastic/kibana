/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreStart } from 'kibana/public';
import { ApolloClient } from 'apollo-client';
import {
  useUiSetting$,
  KibanaContextProvider,
} from '../../../../../src/plugins/kibana_react/public';
import { TriggersActionsProvider } from '../utils/triggers_actions_context';
import { InfraClientStartDeps } from '../types';
import { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';
import { ApolloClientContext } from '../utils/apollo_context';
import { EuiThemeProvider } from '../../../observability/public';
import { NavigationWarningPromptProvider } from '../utils/navigation_warning_prompt';

export const CommonInfraProviders: React.FC<{
  apolloClient: ApolloClient<{}>;
  triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
}> = ({ apolloClient, children, triggersActionsUI }) => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <TriggersActionsProvider triggersActionsUI={triggersActionsUI}>
      <ApolloClientContext.Provider value={apolloClient}>
        <EuiThemeProvider darkMode={darkMode}>
          <NavigationWarningPromptProvider>{children}</NavigationWarningPromptProvider>
        </EuiThemeProvider>
      </ApolloClientContext.Provider>
    </TriggersActionsProvider>
  );
};

export const CoreProviders: React.FC<{
  core: CoreStart;
  plugins: InfraClientStartDeps;
}> = ({ children, core, plugins }) => {
  return (
    <KibanaContextProvider services={{ ...core, ...plugins }}>
      <core.i18n.Context>{children}</core.i18n.Context>
    </KibanaContextProvider>
  );
};
