/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import { HeaderBreadcrumbs } from '../../components/page/navigation/breadcrumb';

interface Props {
  match: {
    params: { hostId: string };
  };
}

export const HostDetails = pure<Props>(({ match }) => (
  <div>
    <HeaderBreadcrumbs />
    <h3>Match: {JSON.stringify(match)}</h3>
    <h2>HostId: {match.params.hostId}</h2>
  </div>
));
