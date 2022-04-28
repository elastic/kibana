/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { SecurityPageName } from '../../../common/constants';
import { EXPLORE, INVESTIGATE } from '../../app/translations';
import { FEATURE, LinkItem } from './types';
import { links as hostsLinks } from '../../hosts/links';
import { links as detectionLinks } from '../../detections/links';
import { links as networkLinks } from '../../network/links';
import { links as usersLinks } from '../../users/links';
import { links as timelinesLinks } from '../../timelines/links';
import { links as casesLinks } from '../../cases/links';
import { links as managementLinks } from '../../management/links';
import { links as overviewLinks, landingLinks, detectionResponseLinks } from '../../overview/links';

export const appLinks: LinkItem[] = [
  overviewLinks,
  landingLinks,
  detectionResponseLinks,
  detectionLinks,
  {
    id: SecurityPageName.explore,
    label: EXPLORE,
    url: 'to do',
    globalNavEnabled: false,
    features: [FEATURE.general],
    globalSearchKeywords: [
      i18n.translate('xpack.securitySolution.search.threatHunting', {
        defaultMessage: 'Threat hunting',
      }),
    ],
    items: [hostsLinks, networkLinks, usersLinks],
  },
  {
    id: SecurityPageName.investigate,
    label: INVESTIGATE,
    url: 'to do',
    globalNavEnabled: false,
    features: [FEATURE.general, FEATURE.casesRead],
    globalSearchKeywords: [
      i18n.translate('xpack.securitySolution.search.investigate', {
        defaultMessage: 'Investigate',
      }),
    ],
    items: [timelinesLinks, casesLinks],
  },
  managementLinks,
];
