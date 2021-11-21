/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiPageContent, EuiLoadingSpinner } from '@elastic/eui';
import { ScopedHistory } from 'src/core/public';

import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';
import { API_BASE_PATH } from '../../common/constants';
import { ClusterUpgradeState } from '../../common/types';
import { APP_WRAPPER_CLASS, GlobalFlyout, AuthorizationProvider } from '../shared_imports';
import { AppDependencies } from '../types';
import { AppContextProvider, useAppContext } from './app_context';
import {
  EsDeprecations,
  EsDeprecationLogs,
  ComingSoonPrompt,
  KibanaDeprecations,
  Overview,
} from './components';

const { GlobalFlyoutProvider } = GlobalFlyout;

const AppHandlingClusterUpgradeState: React.FunctionComponent = () => {
  const {
    isReadOnlyMode,
    services: { api },
  } = useAppContext();

  const [clusterUpgradeState, setClusterUpradeState] =
    useState<ClusterUpgradeState>('isPreparingForUpgrade');

  useEffect(() => {
    api.onClusterUpgradeStateChange((newClusterUpgradeState: ClusterUpgradeState) => {
      setClusterUpradeState(newClusterUpgradeState);
    });
  }, [api]);

  // Read-only mode will be enabled up until the last minor before the next major release
  if (isReadOnlyMode) {
    return <ComingSoonPrompt />;
  }

  if (clusterUpgradeState === 'isUpgrading') {
    return (
      <EuiPageContent
        hasShadow={false}
        paddingSize="none"
        verticalPosition="center"
        horizontalPosition="center"
        data-test-subj="isUpgradingMessage"
      >
        <EuiEmptyPrompt
          iconType="logoElasticsearch"
          title={
            <h1>
              <FormattedMessage
                id="xpack.upgradeAssistant.upgradingTitle"
                defaultMessage="Your cluster is upgrading"
              />
            </h1>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.upgradingDescription"
                defaultMessage="One or more Elasticsearch nodes have a newer version of
                Elasticsearch than Kibana. Once all your nodes are upgraded, upgrade Kibana."
              />
            </p>
          }
          data-test-subj="emptyPrompt"
        />
      </EuiPageContent>
    );
  }

  if (clusterUpgradeState === 'isUpgradeComplete') {
    return (
      <EuiPageContent
        hasShadow={false}
        paddingSize="none"
        verticalPosition="center"
        horizontalPosition="center"
        data-test-subj="isUpgradeCompleteMessage"
      >
        <EuiEmptyPrompt
          iconType="logoElasticsearch"
          title={
            <h1>
              <FormattedMessage
                id="xpack.upgradeAssistant.upgradedTitle"
                defaultMessage="Your cluster has been upgraded"
              />
            </h1>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.upgradedDescription"
                defaultMessage="All Elasticsearch nodes have been upgraded. You may now upgrade Kibana."
              />
            </p>
          }
          data-test-subj="emptyPrompt"
        />
      </EuiPageContent>
    );
  }

  return (
    <Switch>
      <Route exact path="/overview" component={Overview} />
      <Route exact path="/es_deprecations" component={EsDeprecations} />
      <Route exact path="/es_deprecation_logs" component={EsDeprecationLogs} />
      <Route exact path="/kibana_deprecations" component={KibanaDeprecations} />
      <Redirect from="/" to="/overview" />
    </Switch>
  );
};

export const App = ({ history }: { history: ScopedHistory }) => {
  const {
    services: { api },
  } = useAppContext();

  // Poll the API to detect when the cluster is either in the middle of
  // a rolling upgrade or has completed one. We need to create two separate
  // components: one to call this hook and one to handle state changes.
  // This is because the implementation of this hook calls the state-change
  // callbacks on every render, which will get the UI stuck in an infinite
  // render loop if the same component both called the hook and handled
  // the state changes it triggers.
  const { isLoading, isInitialRequest } = api.useLoadClusterUpgradeStatus();

  // Prevent flicker of the underlying UI while we wait for the status to fetch.
  if (isLoading && isInitialRequest) {
    return (
      <EuiPageContent
        hasShadow={false}
        paddingSize="none"
        verticalPosition="center"
        horizontalPosition="center"
      >
        <EuiEmptyPrompt body={<EuiLoadingSpinner size="l" />} />
      </EuiPageContent>
    );
  }

  return (
    <Router history={history}>
      <AppHandlingClusterUpgradeState />
    </Router>
  );
};

export const RootComponent = (dependencies: AppDependencies) => {
  const {
    history,
    core: { i18n, application, http },
  } = dependencies.services;

  return (
    <RedirectAppLinks application={application} className={APP_WRAPPER_CLASS}>
      <AuthorizationProvider httpClient={http} privilegesEndpoint={`${API_BASE_PATH}/privileges`}>
        <i18n.Context>
          <AppContextProvider value={dependencies}>
            <GlobalFlyoutProvider>
              <App history={history} />
            </GlobalFlyoutProvider>
          </AppContextProvider>
        </i18n.Context>
      </AuthorizationProvider>
    </RedirectAppLinks>
  );
};
