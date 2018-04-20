/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { COMPARATORS } from 'plugins/watcher/../common/constants';

export const comparators = {
  'above': {
    label: 'Is above',
    value: COMPARATORS.GREATER_THAN
  },
  'below': {
    label: 'Is below',
    value: COMPARATORS.LESS_THAN
  }
};
