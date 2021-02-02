/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient } from 'apollo-client';
import { AppMountParameters, CoreStart } from 'kibana/public';
import React, { useMemo } from 'react';
import {
  useUiSetting$,
  KibanaContextProvider,
} from '../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public';
import { createKibanaContextForPlugin } from '../hooks/use_kibana';
import { InfraClientStartDeps } from '../types';
import { ApolloClientContext } from '../utils/apollo_context';
import { HeaderActionMenuProvider } from '../utils/header_action_menu_provider';
import { NavigationWarningPromptProvider } from '../utils/navigation_warning_prompt';
import { TriggersActionsProvider } from '../utils/triggers_actions_context';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

export const CommonInfraProviders: React.FC<{
  apolloClient: ApolloClient<{}>;
  appName: string;
  storage: Storage;
  triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}> = ({ apolloClient, children, triggersActionsUI, setHeaderActionMenu, appName, storage }) => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <TriggersActionsProvider triggersActionsUI={triggersActionsUI}>
      <ApolloClientContext.Provider value={apolloClient}>
        <EuiThemeProvider darkMode={darkMode}>
          <DataUIProviders appName={appName} storage={storage}>
            <HeaderActionMenuProvider setHeaderActionMenu={setHeaderActionMenu}>
              <NavigationWarningPromptProvider>{children}</NavigationWarningPromptProvider>
            </HeaderActionMenuProvider>
          </DataUIProviders>
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

const DataUIProviders: React.FC<{ appName: string; storage: Storage }> = ({
  appName,
  children,
  storage,
}) => <KibanaContextProvider services={{ appName, storage }}>{children}</KibanaContextProvider>;
