/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { HostDetails } from './host_details';
import { Hosts } from './hosts';

export const HostsContainer = pure<RouteComponentProps>(({ match }) => (
  <div>
    <Switch>
      <Route strict exact path={'/hosts'} component={Hosts} />
      <Route path={`${match.url}/:hostId`} component={HostDetails} />
      <Redirect from="/hosts/" to="/hosts" />
    </Switch>
  </div>
));
