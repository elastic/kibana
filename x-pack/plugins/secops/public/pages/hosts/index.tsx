/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { pure } from 'recompose';

import { HostDetails } from './host_details';
import { Hosts } from './hosts';

interface Props {
  match: {
    params: { hostName: string };
    url: string;
  };
}

export const HostsContainer = pure<Props>(({ match }) => (
  <div>
    <Route path={`${match.url}/:hostName`} component={HostsContainer} />
    {match.params.hostName ? <HostDetails match={match} /> : <Hosts />}
  </div>
));
