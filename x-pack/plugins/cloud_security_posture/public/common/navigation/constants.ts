/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  CLOUD_SECURITY_POSTURE_BASE_PATH,
} from '@kbn/cloud-security-posture-common';
import { NAV_ITEMS_NAMES } from '@kbn/cloud-security-posture/constants/navigation';
import type { CspBenchmarksPage, CspPage, CspPageNavigationItem } from './types';

const CSPM_DASHBOARD_TAB_NAME = 'Cloud';
const KSPM_DASHBOARD_TAB_NAME = 'Kubernetes';

export const cloudPosturePages: Record<CspPage, CspPageNavigationItem> = {
  dashboard: {
    name: NAV_ITEMS_NAMES.DASHBOARD,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/dashboard`,
    id: 'cloud_security_posture-dashboard',
  },
  cspm_dashboard: {
    name: CSPM_DASHBOARD_TAB_NAME,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/dashboard/${CSPM_POLICY_TEMPLATE}`,
    id: 'cloud_security_posture-cspm-dashboard',
  },
  kspm_dashboard: {
    name: KSPM_DASHBOARD_TAB_NAME,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/dashboard/${KSPM_POLICY_TEMPLATE}`,
    id: 'cloud_security_posture-kspm-dashboard',
  },
  vulnerability_dashboard: {
    name: NAV_ITEMS_NAMES.VULNERABILITY_DASHBOARD,
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/vulnerability_dashboard`,
    id: 'cloud_security_posture-vulnerability_dashboard',
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
    path: `${CLOUD_SECURITY_POSTURE_BASE_PATH}/benchmarks/:benchmarkId/:benchmarkVersion/rules/:ruleId?`,
    id: 'cloud_security_posture-benchmarks-rules',
  },
};

const ELASTIC_BASE_SHORT_URL = 'https://ela.st';

export const cspIntegrationDocsNavigation = {
  kspm: {
    overviewPath: `${ELASTIC_BASE_SHORT_URL}/${KSPM_POLICY_TEMPLATE}`,
    getStartedPath: `${ELASTIC_BASE_SHORT_URL}/${KSPM_POLICY_TEMPLATE}-get-started`,
  },
  cspm: {
    overviewPath: `${ELASTIC_BASE_SHORT_URL}/${CSPM_POLICY_TEMPLATE}`,
    getStartedPath: `${ELASTIC_BASE_SHORT_URL}/${CSPM_POLICY_TEMPLATE}-get-started`,
    awsGetStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started.html`,
    gcpGetStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-gcp.html`,
    azureGetStartedPath: `https://www.elastic.co/guide/en/security/current/cspm-get-started-azure.html`,
  },
};
