/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { ManagementContainer } from './pages';
import { MANAGEMENT_ROUTING_ROOT_PATH } from './common/constants';

/**
 * Returns the React Router Routes for the management area
 */
export const managementRoutes = () => [
  // Mounts the Management interface on `/management`
  <Route path={MANAGEMENT_ROUTING_ROOT_PATH} component={ManagementContainer} />,
];
