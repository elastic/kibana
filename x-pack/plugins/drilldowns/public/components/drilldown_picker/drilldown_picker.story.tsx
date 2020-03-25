/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { DrilldownPicker } from '.';

storiesOf('components/DrilldownPicker', module).add('default', () => {
  return <DrilldownPicker />;
});
