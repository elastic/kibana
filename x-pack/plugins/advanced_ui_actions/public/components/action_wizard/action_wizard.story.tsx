/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { dashboardDrilldownActionFactory, Demo, urlDrilldownActionFactory } from './test_data';

storiesOf('components/ActionWizard', module)
  .add('default', () => (
    <Demo actionFactories={[dashboardDrilldownActionFactory, urlDrilldownActionFactory]} />
  ))
  .add('Only one factory is available', () => (
    // to make sure layout doesn't break
    <Demo actionFactories={[dashboardDrilldownActionFactory]} />
  ))
  .add('Long list of action factories', () => (
    // to make sure layout doesn't break
    <Demo
      actionFactories={[
        dashboardDrilldownActionFactory,
        urlDrilldownActionFactory,
        dashboardDrilldownActionFactory,
        urlDrilldownActionFactory,
        dashboardDrilldownActionFactory,
        urlDrilldownActionFactory,
        dashboardDrilldownActionFactory,
        urlDrilldownActionFactory,
      ]}
    />
  ));
