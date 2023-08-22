/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSecuritySolutionLink } from '@kbn/cloud-security-posture-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SecurityPageName } from '../../common/constants';
import { SERVER_APP_ID } from '../../common/constants';
import cloudSecurityPostureDashboardImage from '../common/images/cloud_security_posture_dashboard_page.png';
import cloudNativeVulnerabilityManagementDashboardImage from '../common/images/cloud_native_vulnerability_management_dashboard_page.png';
import type { LinkItem } from '../common/links/types';
import { IconEndpoints } from '../common/icons/endpoints';

const commonLinkProperties: Partial<LinkItem> = {
  hideTimeline: true,
  capabilities: [`${SERVER_APP_ID}.show`],
};

export const findingsLinks: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('findings'),
  globalNavPosition: 3,
  ...commonLinkProperties,
};

export const cspDashboardLink: LinkItem = {
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

export const vulnerabilityDashboardLink: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('vulnerability_dashboard'),
  description: i18n.translate('xpack.securitySolution.appLinks.vulnerabilityDashboardDescription', {
    defaultMessage:
      'Cloud Native Vulnerability Management (CNVM) allows you to identify vulnerabilities in your cloud workloads.',
  }),
  landingImage: cloudNativeVulnerabilityManagementDashboardImage,
  ...commonLinkProperties,
};

export const benchmarksLink: LinkItem = {
  ...getSecuritySolutionLink<SecurityPageName>('benchmarks'),
  description: i18n.translate(
    'xpack.securitySolution.appLinks.cloudSecurityPostureBenchmarksDescription',
    {
      defaultMessage: 'View benchmark rules for Cloud Security Posture management.',
    }
  ),
  landingIcon: IconEndpoints,
  ...commonLinkProperties,
};
