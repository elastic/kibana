/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { Demo, dashboardFactory, urlFactory } from './test_data';

storiesOf('components/ActionWizard', module)
  .add('default', () => <Demo actionFactories={[dashboardFactory, urlFactory]} />)
  .add('Only one factory is available', () => (
    // to make sure layout doesn't break
    <Demo actionFactories={[dashboardFactory]} />
  ))
  .add('Long list of action factories', () => (
    // to make sure layout doesn't break
    <Demo
      actionFactories={[
        dashboardFactory,
        urlFactory,
        dashboardFactory,
        urlFactory,
        dashboardFactory,
        urlFactory,
        dashboardFactory,
        urlFactory,
      ]}
    />
  ));
