/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { IconExceptionLists } from '../management/icons/exception_lists';
import {
  CLOUD_SECURITY_POSTURE_DASHBOARD_PATH,
  CLOUD_SECURITY_POSTURE_FINDINGS_PATH,
  CLOUD_SECURITY_POSTURE_BENCHMARKS_PATH,
  SecurityPageName,
} from '../../common/constants';
import type { LinkItem, LinkCategories } from '../common/links/types';
import cloudSecurityPostureDashboardImage from '../common/images/cloud_security_posture_dashboard_page.png';

const commonLinkProperties: Partial<LinkItem> = {
  skipUrlState: true,
  hideTimeline: true,
  experimentalKey: 'cloudSecurityPostureNavigation',
};

export const rootLinks: LinkItem = {
  id: SecurityPageName.cloudSecurityPostureFindings,
  title: 'Findings',
  path: CLOUD_SECURITY_POSTURE_FINDINGS_PATH,
  globalNavEnabled: true,
  globalNavOrder: 3,
  ...commonLinkProperties,
};

export const dashboardLinks: LinkItem = {
  id: SecurityPageName.cloudSecurityPostureDashboard,
  title: 'Cloud Posture',
  path: CLOUD_SECURITY_POSTURE_DASHBOARD_PATH,
  description: 'An overview of findings across all CSP integrations.',
  landingImage: cloudSecurityPostureDashboardImage,
  ...commonLinkProperties,
};

export const manageLinks: LinkItem = {
  id: SecurityPageName.cloudSecurityPostureBenchmarks,
  title: 'CSP Benchmarks',
  path: CLOUD_SECURITY_POSTURE_BENCHMARKS_PATH,
  description: 'View, enable, and or disable benchmark rules.',
  // TODO: Temporary until we have a CSP icon
  landingIcon: IconExceptionLists,
  ...commonLinkProperties,
};

export const manageCategories: LinkCategories = [
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.cloudSecurityPosture', {
      defaultMessage: 'CLOUD SECURITY POSTURE',
    }),
    linkIds: [SecurityPageName.cloudSecurityPostureBenchmarks],
  },
];
