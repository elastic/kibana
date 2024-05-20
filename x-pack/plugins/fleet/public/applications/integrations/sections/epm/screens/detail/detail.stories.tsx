/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { INTEGRATIONS_ROUTING_PATHS } from '../../../../constants';

import { Detail as Component } from '.';

export default {
  component: Component,
  title: 'Sections/EPM/Detail',
};

export const nginx = () => (
  <MemoryRouter initialEntries={['/detail/nginx-1.1.0/overview']}>
    <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_overview}>
      <Component />
    </Route>
  </MemoryRouter>
);

export const okta = () => (
  <MemoryRouter initialEntries={['/detail/okta-1.2.0/overview']}>
    <Route path={INTEGRATIONS_ROUTING_PATHS.integration_details_overview}>
      <Component />
    </Route>
  </MemoryRouter>
);
