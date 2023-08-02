/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SERVER_APP_ID } from '@kbn/security-solution-plugin/common';
import type { LinkItem } from '@kbn/security-solution-plugin/public';
import { ExternalPageName, SecurityPagePath } from '../constants';
import type { ProjectNavigationLink } from '../types';
import { IconEcctlLazy, IconFleetLazy } from '../../../common/lazy_icons';
import * as i18n from './translations';

// appLinks configures the Security Solution pages links
const assetsAppLink: LinkItem = {
  id: SecurityPageName.assets,
  title: 'Assets', // i18n,
  path: SecurityPagePath[SecurityPageName.assets],
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: ['assets'], // i18n,
  hideTimeline: true,
  skipUrlState: true,
  links: [], // endpoints and cloudDefend links are added in createAssetsLinkFromManage on runtime
};

// TODO: define the main Cloud Defend link in security_solution plugin
const assetsCloudDefendAppLink: LinkItem = {
  id: SecurityPageName.cloudDefend,
  title: 'Cloud', // i18n,
  description: 'Cloud hosts running Elastic Defend', // i18n,
  path: SecurityPagePath[SecurityPageName.cloudDefend],
  capabilities: [`${SERVER_APP_ID}.show`],
  landingIcon: IconEcctlLazy,
  isBeta: true,
  hideTimeline: true,
  links: [], // cloudDefendPolicies link is added in createAssetsLinkFromManage on runtime
};

export const createAssetsLinkFromManage = (manageLink: LinkItem): LinkItem => {
  const assetsSubLinks = [];

  // Get endpoint sub links from management endpoints category
  const endpointsSubLinkIds =
    manageLink.categories
      ?.find(({ linkIds }) => linkIds.includes(SecurityPageName.endpoints))
      ?.linkIds.filter((linkId) => linkId !== SecurityPageName.endpoints) ?? [];

  const endpointsLink = manageLink.links?.find(({ id }) => id === SecurityPageName.endpoints);
  const endpointsSubLinks =
    manageLink.links?.filter(({ id }) => endpointsSubLinkIds.includes(id)) ?? [];

  if (endpointsLink) {
    assetsSubLinks.push({ ...endpointsLink, links: endpointsSubLinks });
  }

  // Add cloud defend link
  const cloudPoliciesLink = manageLink.links?.find(
    ({ id }) => id === SecurityPageName.cloudDefendPolicies
  );
  if (cloudPoliciesLink) {
    assetsSubLinks.push({ ...assetsCloudDefendAppLink, links: [cloudPoliciesLink] });
  }

  return {
    ...assetsAppLink,
    links: assetsSubLinks, // cloudDefend and endpoints links are added in the projectAppLinksSwitcher on runtime
  };
};

// navLinks define the navigation links for the Security Solution pages and External pages as well
export const assetsFleetNavLinks: ProjectNavigationLink = {
  id: ExternalPageName.fleet,
  title: 'Fleet', // i18n
  landingIcon: IconFleetLazy,
  description: 'Centralized management for Elastic Agents', // i18n,
  links: [
    { id: ExternalPageName.fleetAgents, title: 'Agents' },
    { id: ExternalPageName.fleetPolicies, title: 'Policies' },
    { id: ExternalPageName.fleetEnrollmentTokens, title: 'EnrollmentTokens' },
    { id: ExternalPageName.fleetUninstallTokens, title: 'UninstallTokens' },
    { id: ExternalPageName.fleetDataStreams, title: 'DataStreams' },
    { id: ExternalPageName.fleetSettings, title: 'Settings' },
  ],
};
