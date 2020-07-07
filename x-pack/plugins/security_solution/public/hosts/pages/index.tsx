/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Switch, RouteComponentProps, useHistory } from 'react-router-dom';

import { HostDetails } from './details';
import { HostsTableType } from '../store/model';

import { MlHostConditionalContainer } from '../../common/components/ml/conditional_links/ml_host_conditional_container';
import { Hosts } from './hosts';
import { hostsPagePath, hostDetailsPagePath } from './types';

const getHostsTabPath = () =>
  `/:tabName(` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.alerts})`;

const getHostDetailsTabPath = (pagePath: string) =>
  `${hostDetailsPagePath}/:tabName(` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.alerts})`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const HostsContainer = React.memo<Props>(({ url }) => {
  const history = useHistory();

  return (
    <Switch>
      <Route
        path="/ml-hosts"
        render={({ location, match }) => (
          <MlHostConditionalContainer location={location} url={match.url} />
        )}
      />
      <Route path={getHostsTabPath()}>
        <Hosts hostsPagePath={hostsPagePath} />
      </Route>
      <Route
        path={getHostDetailsTabPath(hostsPagePath)}
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
        }) => {
          history.replace(`${detailName}/${HostsTableType.authentications}${search}`);
          return null;
        }}
      />

      <Route
        exact
        strict
        path=""
        render={({ location: { search = '' } }) => {
          history.replace(`${HostsTableType.hosts}${search}`);
          return null;
        }}
      />
    </Switch>
  );
});

HostsContainer.displayName = 'HostsContainer';
