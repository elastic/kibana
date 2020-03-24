/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { ListManageDrilldowns } from './list_manage_drilldowns';

storiesOf('components/ListManageDrilldowns', module).add('default', () => (
  <ListManageDrilldowns
    drilldowns={[
      { id: '1', actionName: 'Dashboard', drilldownName: 'Drilldown 1', icon: 'dashboardApp' },
      { id: '2', actionName: 'Dashboard', drilldownName: 'Drilldown 2', icon: 'dashboardApp' },
      { id: '3', actionName: 'Dashboard', drilldownName: 'Drilldown 3' },
    ]}
  />
));
