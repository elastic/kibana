/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { routePathsById } from '../../common/route_paths';
import { EndpointListView1 } from './endpoint_list_view_1';
import { ListView2Connected } from './endpoint_list_view_2';

const { path: endpointsBasePath } = routePathsById.endpoints;

export const endpointsSubRoutes = [
  {
    name: 'Endpoints List',
    id: 'endpoints_list_1',
    icon: 'list',
    path: endpointsBasePath, // Default view - matches higher level base route
    component: EndpointListView1,
  },
  {
    name: 'Endpoints List 2',
    id: 'endpoints_list_2',
    icon: 'list',
    path: `${endpointsBasePath}/list2`,
    component: ListView2Connected,
  },
];
