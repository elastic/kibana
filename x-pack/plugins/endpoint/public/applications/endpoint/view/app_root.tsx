/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { Route, Router } from 'react-router-dom';
import { Store } from 'redux';
import { useSelector, Provider } from 'react-redux';
import { AppMountParameters } from 'kibana/public';
import { Setup } from './setup';
import { EndpointPluginStartDependencies } from '../../../plugin';
import { CoreStart } from '../../../../../../../src/core/public';
import { EndpointAppSubplugins, GlobalState } from '../types';

interface RouterProps {
  appMountParams: AppMountParameters;
  store: Store;
  coreStart: CoreStart;
  depsStart: EndpointPluginStartDependencies;
  subplugins: EndpointAppSubplugins;
}

const Routes: React.FunctionComponent<{ subplugins: EndpointAppSubplugins }> = React.memo(
  ({ subplugins: { alerting, hosts, policyList, policyDetails } }) => {
    const alertingState = useSelector((state: GlobalState) => state.alerting);
    const hostsState = useSelector((state: GlobalState) => state.hostList);
    const policyListState = useSelector((state: GlobalState) => state.policyList);
    const policyDetailsState = useSelector((state: GlobalState) => state.policyDetails);

    return (
      <>
        <hosts.SelectorContextProvider value={hostsState}>
          <hosts.Routes />
        </hosts.SelectorContextProvider>
        <alerting.SelectorContextProvider value={alertingState}>
          <alerting.Routes />
        </alerting.SelectorContextProvider>
        <policyList.SelectorContextProvider value={policyListState}>
          <policyList.Routes />
        </policyList.SelectorContextProvider>
        <policyDetails.SelectorContextProvider value={policyDetailsState}>
          <policyDetails.Routes />
        </policyDetails.SelectorContextProvider>
        <Route
          render={() => (
            <FormattedMessage id="xpack.endpoint.notFound" defaultMessage="Page Not Found" />
          )}
        />
      </>
    );
  }
);

// TODO: use this elsewhere
export interface SubpluginDependencies {
  appMountParams: AppMountParameters;
  coreStart: CoreStart;
  depsStart: EndpointPluginStartDependencies;
}

export const SubpluginDependenciesContext = React.createContext<SubpluginDependencies | undefined>(
  undefined
);

/**
 * The root of the Endpoint application react view.
 */
export const AppRoot: React.FunctionComponent<RouterProps> = React.memo(
  ({ appMountParams, store, coreStart, depsStart, subplugins }) => {
    const value = React.useMemo(() => {
      return {
        appMountParams,
        coreStart,
        depsStart,
      };
    }, [appMountParams, coreStart, depsStart]);
    return (
      <Provider store={store}>
        <Router history={appMountParams.history}>
          <SubpluginDependenciesContext.Provider value={value}>
            <Setup
              ingestManager={depsStart.ingestManager}
              notifications={coreStart.notifications}
            />
            <Routes subplugins={subplugins} />
          </SubpluginDependenciesContext.Provider>
        </Router>
      </Provider>
    );
  }
);
