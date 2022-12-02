/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSecuritySolutionLink } from '@kbn/cloud-security-posture-plugin/public';
import { i18n } from '@kbn/i18n';
import { SecurityPageName, SERVER_APP_ID } from '../../common/constants';
import cloudSecurityPostureDashboardImage from '../common/images/cloud_security_posture_dashboard_page.png';
import type { LinkCategories, LinkItem } from '../common/links/types';
import { IconExceptionLists } from '../management/icons/exception_lists';

const commonLinkProperties: Partial<LinkItem> = {
  hideTimeline: true,
  capabilities: [`${SERVER_APP_ID}.show`],
};

export const rootLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('findings'),
  globalNavPosition: 3,
  ...commonLinkProperties,
};

export const dashboardLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('dashboard'),
  description: i18n.translate(
    'xpack.securitySolution.appLinks.cloudSecurityPostureDashboardDescription',
    {
      defaultMessage: 'An overview of findings across all CSP integrations.',
    }
  ),
  landingImage: cloudSecurityPostureDashboardImage,
  ...commonLinkProperties,
};

export const manageLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('benchmarks'),
  description: i18n.translate(
    'xpack.securitySolution.appLinks.cloudSecurityPostureBenchmarksDescription',
    {
      defaultMessage: 'View benchmark rules.',
    }
  ),
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
