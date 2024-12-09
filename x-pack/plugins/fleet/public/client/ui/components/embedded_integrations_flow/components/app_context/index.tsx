/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import useObservable from 'react-use/lib/useObservable';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

import type { FleetStartServices, UIExtensionsStorage } from '../../../../../..';
import type { FleetConfigType } from '../../../../../../plugin';
import {
  ConfigContext,
  FleetStatusProvider,
  FlyoutContextProvider,
  KibanaVersionContext,
  UIExtensionsContextProvider,
} from '../../../../../../hooks';
import { SpaceSettingsContextProvider } from '../../../../../../hooks/use_space_settings_context';
import { ReadOnlyContextProvider } from '../../../../../../applications/integrations/hooks/use_read_only_context';
import {
  AgentPolicyContextProvider,
  IntegrationsStateContextProvider,
  PackageInstallProvider,
} from '../../../../../../applications/integrations/hooks';

const EmptyContext = () => <></>;

export const EmbeddedIntegrationsFlowAppContext: React.FC<{
  startServices: FleetStartServices;
  config: FleetConfigType;
  kibanaVersion: string;
  extensions: UIExtensionsStorage;
  children: React.ReactNode;
}> = memo(({ children, startServices, config, kibanaVersion, extensions }) => {
  const XXL_BREAKPOINT = 1600;
  const darkModeObservable = useObservable(startServices.theme.theme$);
  const isDarkMode = darkModeObservable && darkModeObservable.darkMode;

  const CloudContext = startServices.cloud?.CloudContextProvider || EmptyContext;

  return (
    <KibanaRenderContextProvider
      {...startServices}
      theme={startServices.theme}
      modify={{
        breakpoint: {
          xxl: XXL_BREAKPOINT,
        },
      }}
    >
      <KibanaContextProvider services={{ ...startServices }}>
        <ConfigContext.Provider value={config}>
          <KibanaVersionContext.Provider value={kibanaVersion}>
            {/* This should be removed since theme is passed to `KibanaRenderContextProvider`,
                however, removing this breaks usages of `props.theme.eui` in styled components */}
            <EuiThemeProvider darkMode={isDarkMode}>
              <UIExtensionsContextProvider values={extensions}>
                <FleetStatusProvider>
                  <SpaceSettingsContextProvider>
                    <startServices.customIntegrations.ContextProvider>
                      <CloudContext>
                        <ReadOnlyContextProvider>
                          <AgentPolicyContextProvider>
                            <PackageInstallProvider startServices={startServices}>
                              <FlyoutContextProvider>
                                <IntegrationsStateContextProvider>
                                  {children}
                                </IntegrationsStateContextProvider>
                              </FlyoutContextProvider>
                            </PackageInstallProvider>
                          </AgentPolicyContextProvider>
                        </ReadOnlyContextProvider>
                      </CloudContext>
                    </startServices.customIntegrations.ContextProvider>
                  </SpaceSettingsContextProvider>
                </FleetStatusProvider>
              </UIExtensionsContextProvider>
            </EuiThemeProvider>
          </KibanaVersionContext.Provider>
        </ConfigContext.Provider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
});
