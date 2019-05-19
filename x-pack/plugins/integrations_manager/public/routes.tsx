/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel, EuiTitle } from '@elastic/eui';

const Home = () => (
  <EuiPanel>
    <EuiTitle>
      <h2>Home</h2>
    </EuiTitle>
  </EuiPanel>
);

const ExampleOtherPage = () => (
  <EuiPanel>
    <EuiTitle>
      <h2>Other Page</h2>
    </EuiTitle>
  </EuiPanel>
);

export const routes = [
  { exact: true, path: '/', component: Home, breadcrumb: 'Home' },
  { exact: true, path: '/example', component: ExampleOtherPage, breadcrumb: 'Example Other Page' },
];
