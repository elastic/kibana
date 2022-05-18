/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { AppLinkItems } from './types';
import { links as detectionLinks } from '../../detections/links';
import { links as timelinesLinks } from '../../timelines/links';
import { getCasesLinkItems } from '../../cases/links';
import { getManagementLinkItems } from '../../management/links';
import { dashboardsLandingLinks, threatHuntingLandingLinks } from '../../landing_pages/links';
import { gettingStartedLinks } from '../../overview/links';
import { StartPlugins } from '../../types';

export const getAppLinks = async (
  core: CoreStart,
  plugins: StartPlugins
): Promise<AppLinkItems> => {
  const managementLinks = await getManagementLinkItems(core, plugins);
  const casesLinks = getCasesLinkItems();

  return Object.freeze([
    dashboardsLandingLinks,
    detectionLinks,
    timelinesLinks,
    casesLinks,
    threatHuntingLandingLinks,
    gettingStartedLinks,
    managementLinks,
  ]);
};
