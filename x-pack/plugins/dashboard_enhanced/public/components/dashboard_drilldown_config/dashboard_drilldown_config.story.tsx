/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { DashboardDrilldownConfig } from '.';

export const dashboards = [
  { id: 'dashboard1', title: 'Dashboard 1' },
  { id: 'dashboard2', title: 'Dashboard 2' },
  { id: 'dashboard3', title: 'Dashboard 3' },
];

storiesOf('components/DashboardDrilldownConfig', module).add('default', () => (
  <DashboardDrilldownConfig
    activeDashboardId={'dashboard2'}
    dashboards={dashboards}
    onDashboardSelect={e => console.log('onDashboardSelect', e)}
  />
));
