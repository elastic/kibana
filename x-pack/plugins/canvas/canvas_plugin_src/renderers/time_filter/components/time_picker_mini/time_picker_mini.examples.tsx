/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { TimePickerMini } from '../time_picker_mini';

const startDate = moment()
  .subtract(3, 'm')
  .toISOString();
const endDate = moment()
  .subtract(1, 'w')
  .toISOString();

storiesOf('renderers/TimeFilter/components/TimePickerMini', module).add('default', () => (
  <TimePickerMini from={startDate} to={endDate} onSelect={action('onSelect')} />
));
