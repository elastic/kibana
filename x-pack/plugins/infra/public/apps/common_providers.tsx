/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { CoreStart } from '../../../../../src/core/public/types';
import type { AppMountParameters } from '../../../../../src/core/public/application/types';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public/context/context';
import { useUiSetting$ } from '../../../../../src/plugins/kibana_react/public/ui_settings/use_ui_setting';
import { Storage } from '../../../../../src/plugins/kibana_utils/public/storage/storage';
import type { TriggersAndActionsUIPublicPluginStart } from '../../../triggers_actions_ui/public/plugin';
import { createKibanaContextForPlugin } from '../hooks/use_kibana';
import type { InfraClientStartDeps } from '../types';
import { HeaderActionMenuProvider } from '../utils/header_action_menu_provider';
import { NavigationWarningPromptProvider } from '../utils/navigation_warning_prompt/context';
import { TriggersActionsProvider } from '../utils/triggers_actions_context';

export const CommonInfraProviders: React.FC<{
  appName: string;
  storage: Storage;
  triggersActionsUI: TriggersAndActionsUIPublicPluginStart;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}> = ({ children, triggersActionsUI, setHeaderActionMenu, appName, storage }) => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <TriggersActionsProvider triggersActionsUI={triggersActionsUI}>
      <EuiThemeProvider darkMode={darkMode}>
        <DataUIProviders appName={appName} storage={storage}>
          <HeaderActionMenuProvider setHeaderActionMenu={setHeaderActionMenu}>
            <NavigationWarningPromptProvider>{children}</NavigationWarningPromptProvider>
          </HeaderActionMenuProvider>
        </DataUIProviders>
      </EuiThemeProvider>
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
