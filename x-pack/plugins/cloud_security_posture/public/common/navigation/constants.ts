/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CspBenchmarksPage, CspPage, CspPageNavigationItem } from './types';

const NAV_ITEMS_NAMES = {
  DASHBOARD: i18n.translate('xpack.csp.navigation.dashboardNavItemLabel', {
    defaultMessage: 'Cloud Posture',
  }),
  FINDINGS: i18n.translate('xpack.csp.navigation.findingsNavItemLabel', {
    defaultMessage: 'Findings',
  }),
  BENCHMARKS: i18n.translate('xpack.csp.navigation.myBenchmarksNavItemLabel', {
    defaultMessage: 'CSP Benchmarks',
  }),
  RULES: i18n.translate('xpack.csp.navigation.rulesNavItemLabel', {
    defaultMessage: 'Rules',
  }),
};

/** The base path for all cloud security posture pages. */
export const CLOUD_SECURITY_POSTURE_BASE_PATH = '/cloud_security_posture';

export const cloudPosturePages: Record<CspPage, CspPageNavigationItem> = {
  dashboard: {
    name: NAV_ITEMS_NAMES.DASHBOARD,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/dashboard`,
    id: 'cloud_security_posture-dashboard',
  },
  findings: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings`,
    id: 'cloud_security_posture-findings',
  },
  benchmarks: {
    name: NAV_ITEMS_NAMES.BENCHMARKS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/benchmarks`,
    id: 'cloud_security_posture-benchmarks',
  },
};

export const benchmarksNavigation: Record<CspBenchmarksPage, CspPageNavigationItem> = {
  rules: {
    name: NAV_ITEMS_NAMES.RULES,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/benchmarks/:packagePolicyId/:policyId/rules`,
    id: 'cloud_security_posture-benchmarks-rules',
  },
};

export const findingsNavigation = {
  findings_default: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/default`,
    id: 'cloud_security_posture-findings-default',
  },
  findings_by_resource: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/resource`,
    id: 'cloud_security_posture-findings-resource',
  },
  resource_findings: {
    name: NAV_ITEMS_NAMES.FINDINGS,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/findings/resource/:resourceId`,
    id: 'cloud_security_posture-findings-resourceId',
  },
};
