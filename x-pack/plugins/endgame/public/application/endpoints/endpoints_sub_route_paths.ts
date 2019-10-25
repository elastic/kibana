/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routePathsById } from '../../common/route_paths';
import { EndpointListView1 } from './endpoint_list_view_1';

const endpointsRoute = routePathsById.endpoints;

export const endpointsSubRoutes = [
  {
    name: 'Endpoints List',
    id: 'endpoints_list_1',
    path: endpointsRoute.path, // Default view - matches higher level base route
    component: EndpointListView1,
  },
];
