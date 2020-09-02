/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient } from 'apollo-client';
import { CoreStart } from 'kibana/public';
import React, { useMemo } from 'react';
import { useUiSetting$ } from '../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../observability/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';
import { createKibanaContextForPlugin } from '../hooks/use_kibana';
import { InfraClientStartDeps } from '../types';
import { ApolloClientContext } from '../utils/apollo_context';
import { NavigationWarningPromptProvider } from '../utils/navigation_warning_prompt';
import { TriggersActionsProvider } from '../utils/triggers_actions_context';

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
  const { Provider: KibanaContextProviderForPlugin } = useMemo(
    () => createKibanaContextForPlugin(core, plugins),
    [core, plugins]
  );

  return (
    <KibanaContextProviderForPlugin services={{ ...core, ...plugins }}>
      <core.i18n.Context>{children}</core.i18n.Context>
    </KibanaContextProviderForPlugin>
  );
};
