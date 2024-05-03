/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export const ATTACK_DISCOVERY_TOUR_CONFIG_ANCHORS = {
  NAV_LINK: 'solutionSideNavItemLink-attack_discovery',
  TOAST: 'toast',
};

export const attackDiscoveryTourSteps = [
  {
    title: i18n.ATTACK_DISCOVERY_TOUR_ATTACK_DISCOVERY_TITLE,
    content: i18n.ATTACK_DISCOVERY_TOUR_ATTACK_DISCOVERY_DESC,
    anchor: ATTACK_DISCOVERY_TOUR_CONFIG_ANCHORS.NAV_LINK,
  },
  {
    title: i18n.ATTACK_DISCOVERY_TOUR_VIDEO_STEP_TITLE,
    content: i18n.ATTACK_DISCOVERY_TOUR_VIDEO_STEP_DESC,
    anchor: ATTACK_DISCOVERY_TOUR_CONFIG_ANCHORS.TOAST,
  },
];

export const tourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 450,
};
