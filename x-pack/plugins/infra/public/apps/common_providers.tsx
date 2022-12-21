/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  useUiSetting$,
} from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { NavigationWarningPromptProvider } from '@kbn/observability-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibanaContextForPluginProvider } from '../hooks/use_kibana';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { HeaderActionMenuProvider } from '../utils/header_action_menu_provider';
import { TriggersActionsProvider } from '../utils/triggers_actions_context';

export const CommonInfraProviders: React.FC<{
  appName: string;
  storage: Storage;
  triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}> = ({ children, triggersActionsUI, setHeaderActionMenu, appName, storage, theme$ }) => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <TriggersActionsProvider triggersActionsUI={triggersActionsUI}>
      <EuiThemeProvider darkMode={darkMode}>
        <DataUIProviders appName={appName} storage={storage}>
          <HeaderActionMenuProvider setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
            <NavigationWarningPromptProvider>{children}</NavigationWarningPromptProvider>
          </HeaderActionMenuProvider>
        </DataUIProviders>
      </EuiThemeProvider>
    </TriggersActionsProvider>
  );
};

export interface CoreProvidersProps {
  core: CoreStart;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  theme$: AppMountParameters['theme$'];
}

export const CoreProviders: React.FC<CoreProvidersProps> = ({
  children,
  core,
  pluginStart,
  plugins,
  theme$,
}) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart
  );

  return (
    <KibanaContextProviderForPlugin services={{ ...core, ...plugins, ...pluginStart }}>
      <core.i18n.Context>
        <KibanaThemeProvider theme$={theme$}>{children}</KibanaThemeProvider>
      </core.i18n.Context>
    </KibanaContextProviderForPlugin>
  );
};

const DataUIProviders: React.FC<{ appName: string; storage: Storage }> = ({
  appName,
  children,
  storage,
}) => <KibanaContextProvider services={{ appName, storage }}>{children}</KibanaContextProvider>;
