/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';
import { TimeFilter as Component } from './time_filter';

export const TimeFilter = compose(withState('filter', 'setFilter', ({ filter }) => filter))(
  Component
);
