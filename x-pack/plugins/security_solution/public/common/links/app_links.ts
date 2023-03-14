/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { AppLinkItems } from './types';
import { indicatorsLinks } from '../../threat_intelligence/links';
import { links as detectionLinks } from '../../detections/links';
import { links as timelinesLinks } from '../../timelines/links';
import { getCasesLinkItems } from '../../cases/links';
import { links as managementLinks, getManagementFilteredLinks } from '../../management/links';
import { dashboardsLandingLinks, threatHuntingLandingLinks } from '../../landing_pages/links';
import { gettingStartedLinks } from '../../overview/links';
import { rootLinks as cloudSecurityPostureRootLinks } from '../../cloud_security_posture/links';
import type { StartPlugins } from '../../types';

const casesLinks = getCasesLinkItems();

export const links = Object.freeze([
  dashboardsLandingLinks,
  detectionLinks,
  cloudSecurityPostureRootLinks,
  timelinesLinks,
  casesLinks,
  threatHuntingLandingLinks,
  gettingStartedLinks,
  managementLinks,
  indicatorsLinks,
]);

export const getFilteredLinks = async (
  core: CoreStart,
  plugins: StartPlugins
): Promise<AppLinkItems> => {
  const managementFilteredLinks = await getManagementFilteredLinks(core, plugins);

  return Object.freeze([
    dashboardsLandingLinks,
    detectionLinks,
    cloudSecurityPostureRootLinks,
    timelinesLinks,
    casesLinks,
    threatHuntingLandingLinks,
    gettingStartedLinks,
    managementFilteredLinks,
    indicatorsLinks,
  ]);
};
