/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import type { DiscoverServices } from '@kbn/discover-plugin/public/build_services';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { CoreStart } from '@kbn/core/public';
import { APP_ID } from '../../../common';
import { SecuritySolutionFlyout } from '../../flyout';
import { StatefulEventContext } from '../../common/components/events_viewer/stateful_event_context';
import type { SecurityAppStore } from '../../common/store';
import { ReactQueryClientProvider } from '../../common/containers/query_client/query_client_provider';
import type { StartPluginsDependencies, StartServices } from '../../types';
import { MlCapabilitiesProvider } from '../../common/components/ml/permissions/ml_capabilities_provider';
import { UserPrivilegesProvider } from '../../common/components/user_privileges/user_privileges_context';
import { DiscoverInTimelineContextProvider } from '../../common/components/discover_in_timeline/provider';
import { UpsellingProvider } from '../../common/components/upselling_provider';
import { ConsoleManager } from '../../management/components/console';
import { AssistantProvider } from '../../assistant/provider';

interface GetSecuritySolutionDiscoverAppWrapperArgs {
  store: unknown;
}

interface AppWrapperProps {
  children: React.ReactNode | React.ReactNode[];
}

export const createSecuritySolutionDiscoverAppWrapperGetter = ({
  core,
  services,
  plugins,
}: {
  core: CoreStart;
  services: StartServices;
  plugins: StartPluginsDependencies;
}) => {
  const getSecuritySolutionDiscoverAppWrapper = (
    args: GetSecuritySolutionDiscoverAppWrapperArgs
  ) => {
    return React.memo(function SecuritySolutionDiscoverAppWrapper(props: AppWrapperProps) {
      const discoverServices = useKibana().services as DiscoverServices;
      // console.log({
      //   capabilities: discoverServices.application.capabilities,
      //   services: discoverServices,
      // });

      const CasesContext = useMemo(() => plugins.cases.ui.getCasesContext(), []);

      const userCasesPermissions = useMemo(() => plugins.cases.helpers.canUseCases([APP_ID]), []);

      const securitySolutionServices = useMemo(
        () => ({
          cases: plugins.cases,
          telemetry: services.telemetry,
        }),
        []
      );

      const newServicesForSecurityInDiscover = useMemo(() => {
        return {
          ...discoverServices,
          ...securitySolutionServices,
          apm: services.apm,
          _name: 'securitySolutionDiscoverAppWrapperServices',
          appName: 'OneDiscover',
        };
      }, [discoverServices, securitySolutionServices]);

      return (
        <KibanaContextProvider services={newServicesForSecurityInDiscover}>
          <EuiThemeProvider>
            <MlCapabilitiesProvider>
              <CasesContext owner={[APP_ID]} permissions={userCasesPermissions}>
                <UserPrivilegesProvider kibanaCapabilities={services.application.capabilities}>
                  {/* ^_^ Needed for notes addition */}
                  <NavigationProvider core={core}>
                    <UpsellingProvider upsellingService={services.upselling}>
                      {/* ^_^ Needed for Alert Preview from Expanded Section of Entity Flyout */}
                      <ReduxStoreProvider store={args.store as SecurityAppStore}>
                        <ReactQueryClientProvider>
                          <ConsoleManager>
                            {/* ^_^ Needed for AlertPreview -> Alert Details Flyout Action */}
                            <AssistantProvider>
                              {/* ^_^ Needed for AlertPreview -> Alert Details Flyout Action */}
                              <DiscoverInTimelineContextProvider>
                                {/* ^_^ Needed for Add to Timeline action by `useRiskInputActions`*/}
                                <ExpandableFlyoutProvider>
                                  <SecuritySolutionFlyout />
                                  {/* below context should not be here and should be removed*/}
                                  <StatefulEventContext.Provider
                                    value={{
                                      timelineID: 'not-timeline',
                                      enableHostDetailsFlyout: true,
                                      tabType: 'query',
                                      enableIpDetailsFlyout: true,
                                    }}
                                  >
                                    {props.children}
                                  </StatefulEventContext.Provider>
                                </ExpandableFlyoutProvider>
                              </DiscoverInTimelineContextProvider>
                            </AssistantProvider>
                          </ConsoleManager>
                        </ReactQueryClientProvider>
                      </ReduxStoreProvider>
                    </UpsellingProvider>
                  </NavigationProvider>
                </UserPrivilegesProvider>
              </CasesContext>
            </MlCapabilitiesProvider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      );
    });
  };

  return getSecuritySolutionDiscoverAppWrapper;
};
