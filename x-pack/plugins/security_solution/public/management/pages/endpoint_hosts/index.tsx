/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Switch, Route } from 'react-router-dom';
import React, { memo } from 'react';
import { EndpointList } from './view';
import { MANAGEMENT_ROUTING_ENDPOINTS_PATH } from '../../common/constants';
import { NotFoundPage } from '../../../app/404';

/**
 * Provides the routing container for the hosts related views
 */
export const EndpointsContainer = memo(() => {
  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_ENDPOINTS_PATH} exact component={EndpointList} />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

EndpointsContainer.displayName = 'EndpointsContainer';
export { endpointListFleetApisHttpMock } from './mocks';
export type { EndpointListFleetApisHttpMockInterface } from './mocks';
