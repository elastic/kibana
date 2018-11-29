/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';
import { AdvancedFilter as Component } from './advanced_filter';

export const AdvancedFilter = compose(withState('value', 'onChange', ({ filter }) => filter || ''))(
  Component
);
