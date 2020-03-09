/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { ListManageDrilldowns } from './list_manage_drilldowns';
import { drilldowns } from './test_data';

storiesOf('components/ListManageDrilldowns', module).add('default', () => (
  <ListManageDrilldowns drilldowns={drilldowns} />
));
