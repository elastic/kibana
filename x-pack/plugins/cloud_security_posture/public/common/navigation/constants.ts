/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { INTERNAL_FEATURE_FLAGS } from '../../../common/constants';
import type { CspPage, CspNavigationItem } from './types';

const NAV_ITEMS_NAMES = {
  DASHBOARD: i18n.translate('xpack.csp.navigation.dashboardNavItemLabel', {
    defaultMessage: 'Dashboard',
  }),
  FINDINGS: i18n.translate('xpack.csp.navigation.findingsNavItemLabel', {
    defaultMessage: 'Findings',
  }),
  BENCHMARKS: i18n.translate('xpack.csp.navigation.myBenchmarksNavItemLabel', {
    defaultMessage: 'My Benchmarks',
  }),
  RULES: i18n.translate('xpack.csp.navigation.rulesNavItemLabel', {
    defaultMessage: 'Rules',
  }),
};

export const allNavigationItems: Record<CspPage, CspNavigationItem> = {
  dashboard: { name: NAV_ITEMS_NAMES.DASHBOARD, path: '/dashboard' },
  findings: { name: NAV_ITEMS_NAMES.FINDINGS, path: '/findings' },
  rules: {
    name: NAV_ITEMS_NAMES.RULES,
    path: '/benchmarks/:packagePolicyId/:policyId/rules',
    disabled: !INTERNAL_FEATURE_FLAGS.showBenchmarks,
  },
  benchmarks: {
    name: NAV_ITEMS_NAMES.BENCHMARKS,
    path: '/benchmarks',
    exact: true,
    disabled: !INTERNAL_FEATURE_FLAGS.showBenchmarks,
  },
};

export const findingsNavigation = {
  findings_default: { name: NAV_ITEMS_NAMES.FINDINGS, path: '/findings/default' },
  findings_by_resource: { name: NAV_ITEMS_NAMES.FINDINGS, path: '/findings/resource' },
  resource_findings: { name: NAV_ITEMS_NAMES.FINDINGS, path: '/findings/resource/:resourceId' },
};
