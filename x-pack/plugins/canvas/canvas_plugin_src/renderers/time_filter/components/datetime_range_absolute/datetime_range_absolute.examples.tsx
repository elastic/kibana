/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { DatetimeRangeAbsolute } from '../datetime_range_absolute';

const startDate = moment().subtract(14, 'd');
const endDate = moment();

storiesOf('renderers/TimeFilter/components/DatetimeRangeAbsolute', module).add('default', () => (
  <DatetimeRangeAbsolute from={startDate} to={endDate} onSelect={action('onSelect')} />
));
