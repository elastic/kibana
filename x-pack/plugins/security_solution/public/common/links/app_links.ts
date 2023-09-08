/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { AppLinkItems } from './types';
import { indicatorsLinks } from '../../threat_intelligence/links';
import { links as alertsLinks } from '../../detections/links';
import { links as rulesLinks } from '../../rules/links';
import { links as timelinesLinks } from '../../timelines/links';
import { links as casesLinks } from '../../cases/links';
import { links as managementLinks, getManagementFilteredLinks } from '../../management/links';
import { exploreLinks } from '../../explore/links';
import { gettingStartedLinks } from '../../overview/links';
import { findingsLinks } from '../../cloud_security_posture/links';
import type { StartPlugins } from '../../types';
import { dashboardsLinks } from '../../dashboards/links';

export const links: AppLinkItems = Object.freeze([
  dashboardsLinks,
  alertsLinks,
  findingsLinks,
  casesLinks,
  timelinesLinks,
  indicatorsLinks,
  exploreLinks,
  rulesLinks,
  gettingStartedLinks,
  managementLinks,
]);

export const getFilteredLinks = async (
  core: CoreStart,
  plugins: StartPlugins
): Promise<AppLinkItems> => {
  const managementFilteredLinks = await getManagementFilteredLinks(core, plugins);

  return Object.freeze([
    dashboardsLinks,
    alertsLinks,
    findingsLinks,
    casesLinks,
    timelinesLinks,
    indicatorsLinks,
    exploreLinks,
    rulesLinks,
    gettingStartedLinks,
    managementFilteredLinks,
  ]);
};
