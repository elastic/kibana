/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch, Redirect } from 'react-router-dom';
import { HOSTS_PATH } from '../../../common/constants';
import { HostDetails } from './details';
import { HostsTableType } from '../store/model';

import { MlHostConditionalContainer } from '../../common/components/ml/conditional_links/ml_host_conditional_container';
import { Hosts } from './hosts';
import { hostDetailsPagePath } from './types';

const getHostsTabPath = () =>
  `${HOSTS_PATH}/:tabName(` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.risk}|` +
  `${HostsTableType.alerts}|` +
  `${HostsTableType.sessions})`;

const getHostDetailsTabPath = () =>
  `${hostDetailsPagePath}/:tabName(` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.risk}|` +
  `${HostsTableType.alerts}|` +
  `${HostsTableType.sessions})`;

export const HostsContainer = React.memo(() => (
  <Switch>
    <Route path={`${HOSTS_PATH}/ml-hosts`}>
      <MlHostConditionalContainer />
    </Route>
    <Route path={getHostsTabPath()}>
      <Hosts />
    </Route>
    <Route
      path={getHostDetailsTabPath()}
      render={({
        match: {
          params: { detailName },
        },
      }) => <HostDetails hostDetailsPagePath={hostDetailsPagePath} detailName={detailName} />}
    />
    <Route
      path={hostDetailsPagePath}
      render={({
        match: {
          params: { detailName },
        },
        location: { search = '' },
      }) => (
        <Redirect
          to={{
            pathname: `${HOSTS_PATH}/${detailName}/${HostsTableType.authentications}`,
            search,
          }}
        />
      )}
    />

    <Route
      path={HOSTS_PATH}
      render={({ location: { search = '' } }) => (
        <Redirect to={{ pathname: `${HOSTS_PATH}/${HostsTableType.hosts}`, search }} />
      )}
    />
  </Switch>
));

HostsContainer.displayName = 'HostsContainer';
