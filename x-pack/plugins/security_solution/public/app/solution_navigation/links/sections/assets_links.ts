/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName, ExternalPageName } from '@kbn/security-solution-navigation';
import { ASSETS_PATH, CLOUD_DEFEND_PATH } from '../../../../../common/constants';
import { SERVER_APP_ID } from '../../../../../common';
import type { LinkItem } from '../../../../common/links/types';
import type { SolutionNavLink } from '../../../../common/links';
import { IconEcctlLazy, IconFleetLazy } from './lazy_icons';
import * as i18n from './assets_translations';

// appLinks configures the Security Solution pages links
const assetsAppLink: LinkItem = {
  id: SecurityPageName.assets,
  title: i18n.ASSETS_TITLE,
  path: ASSETS_PATH,
  capabilities: [`${SERVER_APP_ID}.show`],
  hideTimeline: true,
  skipUrlState: true,
  links: [], // endpoints and cloudDefend links are added in createAssetsLinkFromManage
};

// TODO: define this Cloud Defend app link in security_solution plugin
const assetsCloudDefendAppLink: LinkItem = {
  id: SecurityPageName.cloudDefend,
  title: i18n.CLOUD_DEFEND_TITLE,
  description: i18n.CLOUD_DEFEND_DESCRIPTION,
  path: CLOUD_DEFEND_PATH,
  capabilities: [`${SERVER_APP_ID}.show`],
  landingIcon: IconEcctlLazy,
  isBeta: true,
  hideTimeline: true,
  links: [],
};

export const createAssetsLinkFromManage = (manageLink: LinkItem): LinkItem => {
  const assetsSubLinks = [];

  // Get endpoint sub links from the manage categories
  const endpointsSubLinkIds =
    manageLink.categories
      ?.find(({ linkIds }) => linkIds?.includes(SecurityPageName.endpoints))
      ?.linkIds?.filter((linkId) => linkId !== SecurityPageName.endpoints) ?? [];

  const endpointsLink = manageLink.links?.find(({ id }) => id === SecurityPageName.endpoints);
  const endpointsSubLinks =
    manageLink.links?.filter(({ id }) => endpointsSubLinkIds.includes(id)) ?? [];
  if (endpointsLink) {
    // Add main endpoints link with all endpoints sub links
    assetsSubLinks.push({ ...endpointsLink, links: endpointsSubLinks });
  }

  assetsSubLinks.push(assetsCloudDefendAppLink);

  return {
    ...assetsAppLink,
    links: assetsSubLinks,
  };
};

// navLinks define the navigation links for the Security Solution pages and External pages as well
export const assetsNavLinks: SolutionNavLink[] = [
  {
    id: ExternalPageName.fleet,
    title: i18n.FLEET_TITLE,
    landingIcon: IconFleetLazy,
    description: i18n.FLEET_DESCRIPTION,
    links: [
      { id: ExternalPageName.fleetAgents, title: i18n.FLEET_AGENTS_TITLE },
      { id: ExternalPageName.fleetPolicies, title: i18n.FLEET_POLICIES_TITLE },
      { id: ExternalPageName.fleetEnrollmentTokens, title: i18n.FLEET_ENROLLMENT_TOKENS_TITLE },
      { id: ExternalPageName.fleetUninstallTokens, title: i18n.FLEET_UNINSTALL_TOKENS_TITLE },
      { id: ExternalPageName.fleetDataStreams, title: i18n.FLEET_DATA_STREAMS_TITLE },
      { id: ExternalPageName.fleetSettings, title: i18n.FLEET_SETTINGS_TITLE },
    ],
  },
];
