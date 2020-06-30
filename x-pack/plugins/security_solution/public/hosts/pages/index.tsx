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
import { GlobalTime } from '../../common/containers/global_time';
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
    <GlobalTime>
      {({ to, from, setQuery, deleteQuery, isInitializing }) => (
        <Switch>
          <Route
            path="/ml-hosts"
            render={({ location, match }) => (
              <MlHostConditionalContainer location={location} url={match.url} />
            )}
          />
          <Route
            path={getHostsTabPath()}
            render={() => (
              <Hosts
                hostsPagePath={hostsPagePath}
                from={from}
                to={to}
                setQuery={setQuery}
                isInitializing={isInitializing}
                deleteQuery={deleteQuery}
              />
            )}
          />
          <Route
            path={getHostDetailsTabPath(hostsPagePath)}
            render={({
              match: {
                params: { detailName },
              },
            }) => (
              <HostDetails
                hostDetailsPagePath={hostDetailsPagePath}
                detailName={detailName}
                from={from}
                to={to}
                setQuery={setQuery}
                isInitializing={isInitializing}
                deleteQuery={deleteQuery}
              />
            )}
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
      )}
    </GlobalTime>
  );
});

HostsContainer.displayName = 'HostsContainer';
