/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { HostComponentProps } from '../../components/link_to/redirect_to_hosts';

import { HostDetails } from './host_details';
import { Hosts } from './hosts';

export const HostsContainer = pure<HostComponentProps>(({ match }) => (
  <>
    <Switch>
      <Route strict exact path={match.url} component={Hosts} />
      <Route path={`${match.url}/:hostName`} component={HostDetails} />
      <Redirect from="/hosts/" to="/hosts" />
    </Switch>
  </>
));
