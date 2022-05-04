/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../../common/api';
import { CRITICAL, HIGH, LOW, MEDIUM } from './translations';

export const severities = {
  [CaseSeverity.LOW]: {
    color: 'success',
    label: LOW,
  },
  [CaseSeverity.MEDIUM]: {
    color: 'warning',
    label: MEDIUM,
  },
  [CaseSeverity.HIGH]: {
    color: 'ascent',
    label: HIGH,
  },
  [CaseSeverity.CRITICAL]: {
    color: 'danger',
    label: CRITICAL,
  },
};
