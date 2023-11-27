/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export const TIMELINE_TOUR_CONFIG_ANCHORS = {
  ACTION_MENU: 'timeline-action-menu',
  DATA_VIEW: 'timeline-data-view',
  DATA_PROVIDER: 'toggle-data-provider',
  SAVE_TIMELINE: 'save-timeline-action',
};

export const timelineTourSteps = [
  {
    step: 1,
    title: i18n.TIMELINE_TOUR_TIMELINE_ACTIONS_STEP_TITLE,
    content: i18n.TIMELINE_TOUR_TIMELINE_ACTIONS_STEP_DESCRIPTION,
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.ACTION_MENU,
  },
  {
    step: 2,
    title: i18n.TIMELINE_TOUR_CHANGE_DATA_VIEW_TITLE,
    content: i18n.TIMELINE_TOUR_CHANGE_DATA_VIEW_DESCRIPTION,
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.DATA_VIEW,
  },
  {
    step: 3,
    title: i18n.TIMELINE_TOUR_DATA_PROVIDER_VISIBILITY_TITLE,
    content: i18n.TIMELINE_TOUR_DATA_PROVIDER_VISIBILITY_DESCRIPTION,
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.DATA_PROVIDER,
  },
  {
    step: 4,
    title: i18n.TIMELINE_TOUR_SAVE_TIMELINE_STEP_TITLE,
    content: i18n.TIMELINE_TOUR_SAVE_TIMELINE_STEP_DESCRIPTION,
    anchor: TIMELINE_TOUR_CONFIG_ANCHORS.SAVE_TIMELINE,
  },
];

export const tourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 300,
  tourSubtitle: i18n.TIMELINE_TOUR_SUBTITLE,
};
