/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  SectionId,
  QuickStartSectionCardsId,
  OverviewSteps,
  type Section,
  AddIntegrationsSteps,
  ViewDashboardSteps,
  AddAndValidateYourDataCardsId,
  GetStartedWithAlertsCardsId,
  CreateProjectSteps,
} from './types';
import * as i18n from './translations';

import { AddIntegrationButton } from './step_links/add_integration_button';
import { AlertsButton } from './step_links/alerts_link';
import connectToDataSources from './images/connect_to_existing_sources.png';
import enablePrebuiltRules from './images/enable_prebuilt_rules.png';

import viewAlerts from './images/view_alerts.png';
import analyzeDataUsingDashboards from './images/analyze_data_using_dashboards.png';
import { AddElasticRulesButton } from './step_links/add_elastic_rules_button';
import { DashboardButton } from './step_links/dashboard_button';
import overviewVideo from './images/overview_video.svg';

export const createProjectSteps = [
  {
    id: CreateProjectSteps.createFirstProject,
    title: i18n.CREATE_PROJECT_TITLE,
  },
];
export const overviewVideoSteps = [
  {
    id: OverviewSteps.getToKnowElasticSecurity,
    title: i18n.INTRODUCTION_STEP1,
    description: [i18n.INTRODUCTION_STEP1_DESCRIPTION1, i18n.INTRODUCTION_STEP1_DESCRIPTION2],
    splitPanel: (
      <iframe
        allowFullScreen
        className="vidyard_iframe"
        frameBorder="0"
        height="100%"
        width="100%"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
        src="//play.vidyard.com/K6kKDBbP9SpXife9s2tHNP.html?"
        title={i18n.WATCH_OVERVIEW_VIDEO_HEADER}
      />
    ),
    timeInMinutes: 3,
  },
];

export const addIntegrationsSteps = [
  {
    id: AddIntegrationsSteps.connectToDataSources,
    title: i18n.CONFIGURE_STEP3,
    description: [i18n.CONFIGURE_STEP3_DESCRIPTION1, <AddIntegrationButton />],
    splitPanel: (
      <img src={connectToDataSources} alt={i18n.CONFIGURE_STEP3} height="100%" width="100%" />
    ),
  },
];

export const viewDashboardSteps = [
  {
    id: ViewDashboardSteps.analyzeData,
    title: i18n.EXPLORE_STEP2,
    description: [i18n.EXPLORE_STEP2_DESCRIPTION1, <DashboardButton />],
    splitPanel: (
      <img src={analyzeDataUsingDashboards} alt={i18n.EXPLORE_STEP2} height="100%" width="100%" />
    ),
  },
];

export const enablePrebuildRuleSteps = [
  {
    id: AddIntegrationsSteps.enablePrebuiltRules,
    title: i18n.CONFIGURE_STEP4,
    description: [i18n.CONFIGURE_STEP4_DESCRIPTION1, <AddElasticRulesButton />],
    splitPanel: (
      <img src={enablePrebuiltRules} alt={i18n.CONFIGURE_STEP4} height="100%" width="100%" />
    ),
  },
];

export const viewAlertSteps = [
  {
    id: ViewDashboardSteps.viewAlerts,
    title: i18n.EXPLORE_STEP1,
    description: [i18n.EXPLORE_STEP1_DESCRIPTION1, <AlertsButton />],
    splitPanel: <img src={viewAlerts} alt={i18n.EXPLORE_STEP1} height="100%" width="100%" />,
  },
];

export const sections: Section[] = [
  {
    id: SectionId.quickStart,
    title: i18n.QUICK_START_SECTION_TITLE,
    cards: [
      {
        title: i18n.CREATE_PROJECT_TITLE,
        icon: { type: 'addDataApp', size: 'xl' },
        id: QuickStartSectionCardsId.createFirstProject,
        steps: createProjectSteps,
        hideSteps: true,
      },
      {
        icon: { type: overviewVideo, size: 'xl' },
        title: i18n.OVERVIEW_VIDEO_TITLE,
        id: QuickStartSectionCardsId.watchTheOverviewVideo,
        steps: overviewVideoSteps,
      },
    ],
  },
  {
    id: SectionId.addAndValidateYourData,
    title: i18n.ADD_AND_VALIDATE_DATA_TITLE,
    cards: [
      {
        title: i18n.ADD_INTEGRATION_TITLE,
        icon: { type: 'fleetApp', size: 'xl' },
        id: AddAndValidateYourDataCardsId.addIntegrations,
        steps: addIntegrationsSteps,
      },
      {
        icon: { type: 'dashboardApp', size: 'xl' },
        title: i18n.VIEW_DASHBOARD_TITLE,
        id: AddAndValidateYourDataCardsId.viewDashboards,
        steps: viewDashboardSteps,
      },
    ],
  },
  {
    id: SectionId.getStartedWithAlerts,
    title: i18n.GET_STARTED_WITH_ALERTS_TITLE,
    cards: [
      {
        title: i18n.CONFIGURE_STEP4,
        icon: { type: 'advancedSettingsApp', size: 'xl' },
        id: GetStartedWithAlertsCardsId.enablePrebuiltRules,
        steps: enablePrebuildRuleSteps,
      },
      {
        icon: { type: 'watchesApp', size: 'xl' },
        title: i18n.EXPLORE_STEP1,
        id: GetStartedWithAlertsCardsId.viewAlerts,
        steps: viewAlertSteps,
      },
    ],
  },
];

export const getSections = () => sections;
