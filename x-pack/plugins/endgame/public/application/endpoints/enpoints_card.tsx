/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { EuiCard } from '@elastic/eui';
import { routePathsById } from '../../common/route_paths';

function EndpointsCard(props: RouteComponentProps) {
  return (
    <EuiCard
      layout="horizontal"
      title="Endpoint Management"
      description="View and manage the endpoints"
      onClick={() => props.history.push(routePathsById.endpoints.path)}
    />
  );
}

export const EndpointsCardShowcase = withRouter(EndpointsCard);
