/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState } from 'recompose';
import { DropdownFilter as Component } from './dropdown_filter';

export const DropdownFilter = compose(withState('value', 'onChange', ({ value }) => value || ''))(
  Component
);
