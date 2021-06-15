/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch, RouteComponentProps, Redirect } from 'react-router-dom';

import { HostDetails } from './details';
import { HostsTableType } from '../store/model';

import { MlHostConditionalContainer } from '../../common/components/ml/conditional_links/ml_host_conditional_container';
import { Hosts } from './hosts';
import { hostsPagePath, hostDetailsPagePath } from './types';

const getHostsTabPath = () =>
  `${hostsPagePath}/:tabName(` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.alerts})`;

const getHostDetailsTabPath = () =>
  `${hostDetailsPagePath}/:tabName(` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.alerts})`;

type Props = Partial<RouteComponentProps<{}>>;

export const HostsContainer = React.memo<Props>(() => {
  return (
    <Switch>
      <Route
        exact
        strict
        path={hostsPagePath}
        render={({ location: { search = '' } }) => (
          <Redirect to={{ pathname: `${hostsPagePath}/${HostsTableType.hosts}`, search }} />
        )}
      />

      <Route path={`${hostsPagePath}/ml-hosts`}>
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
              pathname: `${hostsPagePath}/${detailName}/${HostsTableType.authentications}`,
              search,
            }}
          />
        )}
      />
    </Switch>
  );
});

HostsContainer.displayName = 'HostsContainer';
