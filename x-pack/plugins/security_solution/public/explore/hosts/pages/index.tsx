/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Redirect } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';
import { HOSTS_PATH } from '../../../../common/constants';
import { HostDetails } from './details';
import { HostsTableType } from '../store/model';

import { MlHostConditionalContainer } from '../../../common/components/ml/conditional_links/ml_host_conditional_container';
import { Hosts } from './hosts';
import { hostDetailsPagePath } from './types';

const getHostsTabPath = () =>
  `${HOSTS_PATH}/:tabName(` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.risk}|` +
  `${HostsTableType.sessions})`;

const getHostDetailsTabPath = () =>
  `${hostDetailsPagePath}/:tabName(` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.risk}|` +
  `${HostsTableType.sessions})`;

export const HostsContainer = React.memo(() => (
  <Switch>
    <Route path={`${HOSTS_PATH}/ml-hosts`}>
      <MlHostConditionalContainer />
    </Route>
    <Route // Compatibility redirect for the old external alert path to events page with external alerts showing.
      path={`${HOSTS_PATH}/externalAlerts`}
      render={({ location: { search = '' } }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/${HostsTableType.events}`,
            search: `${search}&onlyExternalAlerts=true`,
          }}
        />
      )}
    />
    <Route path={getHostsTabPath()}>
      <Hosts />
    </Route>
    <Route
      path={getHostDetailsTabPath()}
      render={({
        match: {
          params: { detailName },
        },
      }) => (
        <HostDetails
          hostDetailsPagePath={hostDetailsPagePath}
          detailName={decodeURIComponent(detailName)}
        />
      )}
    />
    <Route // Redirect to the first tab when tabName is not present.
      path={hostDetailsPagePath}
      render={({
        match: {
          params: { detailName },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/name/${detailName}/${HostsTableType.authentications}`,
            search,
          }}
        />
      )}
    />
    <Route // Compatibility redirect for the old user detail path.
      path={`${HOSTS_PATH}/:detailName/:tabName?`}
      render={({
        match: {
          params: { detailName, tabName = HostsTableType.authentications },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/name/${detailName}/${tabName}`,
            search,
          }}
        />
      )}
    />
    <Route // Redirect to the first tab when tabName is not present.
      path={HOSTS_PATH}
      render={({ location: { search = '' } }) => (
        <Redirect to={{ pathname: `${HOSTS_PATH}/${HostsTableType.hosts}`, search }} />
      )}
    />
  </Switch>
));

HostsContainer.displayName = 'HostsContainer';
