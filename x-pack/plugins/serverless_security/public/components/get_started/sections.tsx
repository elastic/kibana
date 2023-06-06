/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { Section, TogglePanelId } from './types';
import * as i18n from './translations';
import respond from './images/respond.svg';
import protect from './images/protect.svg';

export const ActiveConditions = {
  anyCondition: [TogglePanelId.Analytics, TogglePanelId.Cloud, TogglePanelId.Endpoint],
  analyticsToggled: [TogglePanelId.Analytics],
  cloudToggled: [TogglePanelId.Cloud],
  endpointToggled: [TogglePanelId.Endpoint],
};

export const sections: Section[] = [
  {
    id: 'getSetUp',
    title: i18n.GET_SET_UP_TITLE,
    cards: [
      {
        title: i18n.INTRODUCTION_TITLE,
        icon: { type: 'securityApp', size: 'xl' },
        id: 'introduction',
        activeConditions: ActiveConditions.anyCondition,
        steps: [
          {
            id: 'watchOverviewVideo',
            title: i18n.WATCH_OVERVIEW_VIDEO_TITLE,
            description: [
              i18n.WATCH_OVERVIEW_VIDEO_DESCRIPTION1,
              i18n.WATCH_OVERVIEW_VIDEO_DESCRIPTION2,
              i18n.WATCH_OVERVIEW_VIDEO_DESCRIPTION3,
            ],
            splitPanel: (
              <iframe
                allowFullScreen
                className="vidyard_iframe"
                frameBorder="0"
                height="100%"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin"
                scrolling="no"
                src="//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?"
                title={i18n.WATCH_OVERVIEW_VIDEO_HEADER}
                width="100%"
              />
            ),
            timeInMinutes: 3,
            badges: [
              { id: 'analytics', name: i18n.PRODUCT_BADGE_ANALYTICS },
              { id: 'cloud', name: i18n.PRODUCT_BADGE_CLOUD },
              { id: 'edr', name: i18n.PRODUCT_BADGE_EDR },
            ],
          },
        ],
      },
      {
        icon: { type: 'agentApp', size: 'xl' },
        title: i18n.BRING_IN_YOUR_DATA_TITLE,
        id: 'bringInYourData',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        title: i18n.ACTIVATE_AND_CREATE_RULES_TITLE,
        id: 'activateAndCreateRules',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: protect, size: 'xl' },
        title: i18n.PROTECT_YOUR_ENVIRONMENT_TITLE,
        id: 'protectYourEnvironmentInRuntime',
        activeConditions: [...ActiveConditions.cloudToggled, ...ActiveConditions.endpointToggled],
      },
    ],
  },
  {
    id: 'getMoreFromElasticSecurity',
    title: i18n.GET_MORE_TITLE,
    cards: [
      {
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        title: i18n.MASTER_THE_INVESTIGATION_TITLE,
        id: 'masterTheInvestigationsWorkflow',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: respond, size: 'xl' },
        title: i18n.RESPOND_TO_THREATS_TITLE,
        id: 'respondToThreatsWithAutomation',
        activeConditions: ActiveConditions.anyCondition,
      },
      {
        icon: { type: 'spacesApp', size: 'xl' },
        title: i18n.OPTIMIZE_YOUR_WORKSPACE_TITLE,
        id: 'optimizeYourWorkspace',
        activeConditions: ActiveConditions.anyCondition,
      },
    ],
  },
];
