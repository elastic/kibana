/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  SectionId,
  QuickStart,
  type Section,
  AddAndValidateData,
  GetStartedWithAlerts,
} from './types';
import * as i18n from './translations';
import overviewVideo from './images/overview_video.svg';
import { AlertsButton } from './step_links/alerts_link';
import { AddElasticRulesButton } from './step_links/add_elastic_rules_button';
import { DashboardButton } from './step_links/dashboard_button';
import { AddIntegrationButton } from './step_links/add_integration_button';
import { WatchOverviewButton } from './step_links/watch_overview_video_button';

const sections: Section[] = [
  {
    id: SectionId.quicStart,
    title: i18n.QUICK_START_TITLE,
    cards: [
      {
        id: QuickStart.createFirstProject,
        title: i18n.CREATE_FIRST_PROJECT_TITLE,
        allowUndo: false,
        icon: {
          type: 'addDataApp',
        },
      },
      {
        id: QuickStart.watchTheOverviewVideo,
        title: i18n.WATCH_THE_OVERVIEW_VIDEO_TITLE,
        description: i18n.WATCH_THE_OVERVIEW_VIDEO_DESCRIPTION,
        icon: {
          type: overviewVideo,
        },
        startButton: <WatchOverviewButton title={i18n.START_BUTTON_TEXT} />,
      },
    ],
  },
  {
    id: SectionId.addAndValidateData,
    title: i18n.ADD_AND_VALIDATE_DATA_TITLE,
    cards: [
      {
        id: AddAndValidateData.addIntegration,
        title: i18n.ADD_INTEGRATION_TITLE,
        description: i18n.ADD_INTEGRATION_DESCRIPTION,
        icon: {
          type: 'fleetApp',
        },
        startButton: <AddIntegrationButton title={i18n.START_BUTTON_TEXT} />,
      },
      {
        id: AddAndValidateData.viewAndAnalyzeDataWithDashboards,
        title: i18n.VIEW_AND_ANALYZE_DATA_TITLE,
        description: i18n.VIEW_AND_ANALYZE_DATA_DESCRIPTION,
        icon: {
          type: 'dashboardApp',
        },
        startButton: <DashboardButton title={i18n.START_BUTTON_TEXT} />,
      },
    ],
  },
  {
    id: SectionId.getStartedWithAlerts,
    title: i18n.GET_STARTED_WITH_ALERTS_TITLE,
    cards: [
      {
        id: GetStartedWithAlerts.enablePrebuiltRules,
        title: i18n.ENABLE_PREBUILT_RULES_TITLE,
        description: i18n.ENABLE_PREBUILT_RULES_DESCRIPTION,
        icon: {
          type: `advancedSettingsApp`,
        },
        startButton: <AddElasticRulesButton title={i18n.START_BUTTON_TEXT} />,
      },
      {
        id: GetStartedWithAlerts.viewAlerts,
        title: i18n.VIEW_ALERTS_TITLE,
        description: i18n.VIEW_ALERTS_DESCRIPTION,
        icon: {
          type: `watchesApp`,
        },
        startButton: <AlertsButton title={i18n.START_BUTTON_TEXT} />,
      },
    ],
  },
];

export const getSections = () => sections;
