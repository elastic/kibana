/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as TEXT from './translations';
import { INTERNAL_FEATURE_FLAGS } from '../../../common/constants';
import type { CspPage, CspNavigationItem } from './types';

export const allNavigationItems: Record<CspPage, CspNavigationItem> = {
  dashboard: { name: TEXT.DASHBOARD, path: '/dashboard' },
  findings: { name: TEXT.FINDINGS, path: '/findings' },
  rules: {
    name: 'Rules',
    path: '/benchmarks/:packagePolicyId/:policyId/rules',
    disabled: !INTERNAL_FEATURE_FLAGS.showBenchmarks,
  },
  benchmarks: {
    name: TEXT.MY_BENCHMARKS,
    path: '/benchmarks',
    exact: true,
    disabled: !INTERNAL_FEATURE_FLAGS.showBenchmarks,
  },
};
