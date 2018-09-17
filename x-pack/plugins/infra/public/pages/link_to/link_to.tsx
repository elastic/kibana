/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';

import { RedirectToContainerLogs } from './redirect_to_container_logs';
import { RedirectToHostLogs } from './redirect_to_host_logs';
import { RedirectToPodLogs } from './redirect_to_pod_logs';

interface LinkToPageProps {
  match: RouteMatch<{}>;
}

export class LinkToPage extends React.Component<LinkToPageProps> {
  public render() {
    const { match } = this.props;

    return (
      <Switch>
        <Route
          path={`${match.url}/container-logs/:containerId`}
          component={RedirectToContainerLogs}
        />
        <Route path={`${match.url}/host-logs/:hostname`} component={RedirectToHostLogs} />
        <Route path={`${match.url}/pod-logs/:podId`} component={RedirectToPodLogs} />
        <Redirect to="/home" />
      </Switch>
    );
  }
}
