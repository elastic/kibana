/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { TimePicker } from '../time_picker';

const startDate = moment()
  .subtract(1, 'y')
  .toISOString();
const endDate = moment().toISOString();

storiesOf('renderers/TimeFilter/components/TimePicker', module).add('default', () => (
  <TimePicker from={startDate} to={endDate} onSelect={action('onSelect')} />
));
