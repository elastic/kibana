/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { SecurityPageName, THREAT_HUNTING_PATH } from '../../../common/constants';
import { THREAT_HUNTING } from '../../app/translations';
import { FEATURE, LinkItem } from './types';
import { links as hostsLinks } from '../../hosts/links';
import { links as detectionLinks } from '../../detections/links';
import { links as networkLinks } from '../../network/links';
import { links as usersLinks } from '../../users/links';
import { links as timelinesLinks } from '../../timelines/links';
import { getCasesLinkItems } from '../../cases/links';
import { links as managementLinks } from '../../management/links';
import { gettingStartedLinks, dashboardsLandingLinks } from '../../overview/links';

export const appLinks: LinkItem[] = [
  gettingStartedLinks,
  dashboardsLandingLinks,
  detectionLinks,
  {
    id: SecurityPageName.threatHuntingLanding,
    title: THREAT_HUNTING,
    path: THREAT_HUNTING_PATH,
    globalNavEnabled: false,
    features: [FEATURE.general],
    globalSearchKeywords: [
      i18n.translate('xpack.securitySolution.search.threatHunting', {
        defaultMessage: 'Threat hunting',
      }),
    ],
    links: [hostsLinks, networkLinks, usersLinks],
  },
  timelinesLinks,
  getCasesLinkItems(),
  managementLinks,
];
