/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';

interface Props {
  match: {
    params: { hostName: string };
  };
}

export const HostDetails = pure<Props>(({ match }) => (
  <div>
    <h3>Match: {JSON.stringify(match)}</h3>
    <h2>Hostname: {match.params.hostName}</h2>
  </div>
));
