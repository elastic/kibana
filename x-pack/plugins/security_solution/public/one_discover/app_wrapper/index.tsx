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
import { SecuritySolutionFlyout } from '../../flyout';
import { StatefulEventContext } from '../../common/components/events_viewer/stateful_event_context';
import type { SecurityAppStore } from '../../common/store';
import { ReactQueryClientProvider } from '../../common/containers/query_client/query_client_provider';
import type { StartServices } from '../../types';

interface GetSecuritySolutionDiscoverAppWrapperArgs {
  store: unknown;
}

interface AppWrapperProps {
  children: React.ReactNode | React.ReactNode[];
}

export const createSecuritySolutionDiscoverAppWrapperGetter = ({
  core,
  services,
}: {
  core: CoreStart;
  services: StartServices;
}) => {
  const getSecuritySolutionDiscoverAppWrapper = (
    args: GetSecuritySolutionDiscoverAppWrapperArgs
  ) => {
    return React.memo(function SecuritySolutionDiscoverAppWrapper(props: AppWrapperProps) {
      console.log(`Enclosing in security app wrapper`);
      const discoverServices = useKibana().services as DiscoverServices;
      const newServicesForSecurityInDiscover = useMemo(() => {
        return {
          ...discoverServices,
          apm: services.apm,
          _name: 'securitySolutionDiscoverAppWrapperServices',
        };
      }, [discoverServices]);
      return (
        <KibanaContextProvider services={newServicesForSecurityInDiscover}>
          <EuiThemeProvider>
            <NavigationProvider core={core}>
              <ReduxStoreProvider store={args.store as SecurityAppStore}>
                <ReactQueryClientProvider>
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
                </ReactQueryClientProvider>
              </ReduxStoreProvider>
            </NavigationProvider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      );
    });
  };

  return getSecuritySolutionDiscoverAppWrapper;
};
