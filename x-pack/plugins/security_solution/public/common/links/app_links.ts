/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AppLinkItems } from './types';
import { links as detectionLinks } from '../../detections/links';
import { links as timelinesLinks } from '../../timelines/links';
import { getCasesLinkItems } from '../../cases/links';
import { links as managementLinks } from '../../management/links';
import { dashboardsLandingLinks, threatHuntingLandingLinks } from '../../landing_pages/links';
import { gettingStartedLinks } from '../../overview/links';

const appLinks: AppLinkItems = Object.freeze([
  dashboardsLandingLinks,
  detectionLinks,
  timelinesLinks,
  getCasesLinkItems(),
  threatHuntingLandingLinks,
  gettingStartedLinks,
  managementLinks,
]);

export const getAllAppLinks = () => appLinks;
