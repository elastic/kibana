/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { NavigationWarningPromptProvider } from '@kbn/observability-shared-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import {
  type KibanaEnvContext,
  useKibanaContextForPluginProvider,
  useKibanaEnvironmentContextProvider,
} from '../hooks/use_kibana';
import { InfraClientStartDeps, InfraClientStartExports } from '../types';
import { HeaderActionMenuProvider } from '../utils/header_action_menu_provider';
import { TriggersActionsProvider } from '../utils/triggers_actions_context';
import { useIsDarkMode } from '../hooks/use_is_dark_mode';

export const CommonInfraProviders: React.FC<{
  appName: string;
  storage: Storage;
  triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}> = ({
  children,
  triggersActionsUI,
  observabilityAIAssistant: { service: observabilityAIAssistantService },
  setHeaderActionMenu,
  appName,
  storage,
  theme$,
}) => {
  const darkMode = useIsDarkMode();

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
  kibanaEnvironment?: KibanaEnvContext;
}

export const CoreProviders: React.FC<CoreProvidersProps> = ({
  children,
  core,
  pluginStart,
  plugins,
  theme$,
  kibanaEnvironment,
}) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart
  );

  const KibanaEnvContextForPluginProvider = useKibanaEnvironmentContextProvider(kibanaEnvironment);

  return (
    <RedirectAppLinks
      coreStart={{
        application: core.application,
      }}
    >
      <KibanaContextProviderForPlugin services={{ ...core, ...plugins, ...pluginStart }}>
        <KibanaEnvContextForPluginProvider kibanaEnv={kibanaEnvironment}>
          <core.i18n.Context>
            <KibanaThemeProvider theme$={theme$}>{children}</KibanaThemeProvider>
          </core.i18n.Context>
        </KibanaEnvContextForPluginProvider>
      </KibanaContextProviderForPlugin>
    </RedirectAppLinks>
  );
};

const DataUIProviders: React.FC<{ appName: string; storage: Storage }> = ({
  appName,
  children,
  storage,
}) => <KibanaContextProvider services={{ appName, storage }}>{children}</KibanaContextProvider>;
