/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getSecuritySolutionDashboardLinks,
  getSecuritySolutionManageLinks,
  getSecuritySolutionRootLinks,
} from '@kbn/cloud-security-posture-plugin/public';
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../common/constants';
import cloudSecurityPostureDashboardImage from '../common/images/cloud_security_posture_dashboard_page.png';
import type { LinkCategories, LinkItem } from '../common/links/types';
import { IconExceptionLists } from '../management/icons/exception_lists';

const commonLinkProperties: Partial<LinkItem> = {
  hideTimeline: true,
  experimentalKey: 'cloudSecurityPostureNavigation',
};

export const rootLinks: LinkItem = getSecuritySolutionRootLinks<LinkItem>({
  [SecurityPageName.cloudSecurityPostureFindings]: {
    globalNavEnabled: true,
    globalNavOrder: 3,
    ...commonLinkProperties,
  },
});

export const dashboardLinks = getSecuritySolutionDashboardLinks<LinkItem>({
  [SecurityPageName.cloudSecurityPostureDashboard]: {
    description: i18n.translate(
      'xpack.securitySolution.appLinks.cloudSecurityPostureDashboardDescription',
      {
        defaultMessage: 'An overview of findings across all CSP integrations.',
      }
    ),
    landingImage: cloudSecurityPostureDashboardImage,
    // TODO: When CSP is rendered exclusively in the security solution - remove this and rename the title inside the
    //  CSP plugin
    title: i18n.translate('xpack.securitySolution.appLinks.cloudSecurityPostureDashboard', {
      defaultMessage: 'Cloud Posture',
    }),
    ...commonLinkProperties,
  },
});

export const manageLinks: LinkItem = getSecuritySolutionManageLinks<LinkItem>({
  [SecurityPageName.cloudSecurityPostureBenchmarks]: {
    // TODO: When CSP is rendered exclusively in the security solution - remove this and rename the title inside the
    //  CSP plugin
    title: i18n.translate('xpack.securitySolution.appLinks.cloudSecurityPostureBenchmarks', {
      defaultMessage: 'CSP Benchmarks',
    }),
    description: i18n.translate(
      'xpack.securitySolution.appLinks.cloudSecurityPostureBenchmarksDescription',
      {
        defaultMessage: 'View, enable, and or disable benchmark rules.',
      }
    ),
    landingIcon: IconExceptionLists,
    ...commonLinkProperties,
  },
  [SecurityPageName.cloudSecurityPostureRules]: {
    sideNavDisabled: true,
    globalSearchDisabled: true,
    ...commonLinkProperties,
  },
});

export const manageCategories: LinkCategories = [
  {
    label: i18n.translate('xpack.securitySolution.appLinks.category.cloudSecurityPosture', {
      defaultMessage: 'CLOUD SECURITY POSTURE',
    }),
    linkIds: [SecurityPageName.cloudSecurityPostureBenchmarks],
  },
];
