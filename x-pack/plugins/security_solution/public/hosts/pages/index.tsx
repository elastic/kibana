/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';

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

export const HostsContainer = React.memo(() => {
  const history = useHistory();

  const hostDetailsPagePathCallback = useCallback(
    ({
      match: {
        params: { detailName },
      },
      location: { search = '' },
    }) => {
      history.replace(`${detailName}/${HostsTableType.authentications}${search}`);
      return null;
    },
    [history]
  );

  const basePathCallback = useCallback(
    ({ location: { search = '' } }) => {
      history.replace(`${HostsTableType.hosts}${search}`);
      return null;
    },
    [history]
  );

  const mlHostsCallback = useCallback(
    ({ match }) => <MlHostConditionalContainer url={match.url} />,
    []
  );

  return (
    <Switch>
      <Route path="/ml-hosts" render={mlHostsCallback} />
      <Route path={getHostsTabPath()}>
        <Hosts hostsPagePath={hostsPagePath} />
      </Route>
      <Route path={getHostDetailsTabPath(hostsPagePath)}>
        <HostDetails hostDetailsPagePath={hostDetailsPagePath} />
      </Route>
      <Route path={hostDetailsPagePath} render={hostDetailsPagePathCallback} />
      <Route exact strict path="" render={basePathCallback} />
    </Switch>
  );
});

HostsContainer.displayName = 'HostsContainer';
