/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { StepId } from './types';
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
  EnablePrebuiltRulesSteps,
  ViewAlertsSteps,
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
import { Video } from './card_step/video';

export const createProjectSteps = [
  {
    id: CreateProjectSteps.createFirstProject,
    title: i18n.SECTION_1_CARD_1_TITLE,
    icon: { type: 'addDataApp', size: 'xl' as const },
  },
];
export const overviewVideoSteps = [
  {
    icon: { type: overviewVideo, size: 'xl' as const },
    title: i18n.SECTION_1_CARD_2_TITLE,
    id: OverviewSteps.getToKnowElasticSecurity,
    description: [i18n.INTRODUCTION_STEP1_DESCRIPTION1, i18n.INTRODUCTION_STEP1_DESCRIPTION2],
    splitPanel: <Video />,
  },
];

export const addIntegrationsSteps = [
  {
    icon: { type: 'fleetApp', size: 'xl' as const },
    id: AddIntegrationsSteps.connectToDataSources,
    title: i18n.SECTION_2_CARD_1_TITLE,
    description: [i18n.CONFIGURE_STEP3_DESCRIPTION1, <AddIntegrationButton />],
    splitPanel: (
      <img
        src={connectToDataSources}
        alt={i18n.SECTION_2_CARD_1_TITLE_TASK_1_BUTTON_TITLE}
        height="100%"
        width="100%"
      />
    ),
    checkIfStepCompleted: (indicesExist: boolean) => indicesExist === true,
  },
];

export const viewDashboardSteps = [
  {
    id: ViewDashboardSteps.analyzeData,
    icon: { type: 'dashboardApp', size: 'xl' as const },
    title: i18n.SECTION_2_CARD_2_TITLE,
    description: [i18n.EXPLORE_STEP2_DESCRIPTION1, <DashboardButton />],
    splitPanel: (
      <img
        src={analyzeDataUsingDashboards}
        alt={i18n.SECTION_2_CARD_2_TASK_1_BUTTON_TITLE}
        height="100%"
        width="100%"
      />
    ),
  },
];

export const enablePrebuildRuleSteps = [
  {
    title: i18n.SECTION_3_CARD_1_TITLE,
    icon: { type: 'advancedSettingsApp', size: 'xl' as const },
    id: EnablePrebuiltRulesSteps.enablePrebuiltRules,
    description: [i18n.CONFIGURE_STEP4_DESCRIPTION1, <AddElasticRulesButton />],
    splitPanel: (
      <img
        src={enablePrebuiltRules}
        alt={i18n.SECTION_3_CARD_1_TASK_1_BUTTON_TITLE}
        height="100%"
        width="100%"
      />
    ),
    checkIfStepCompleted: (rulesInstalled: boolean) => rulesInstalled === true,
  },
];

export const viewAlertSteps = [
  {
    icon: { type: 'watchesApp', size: 'xl' as const },
    title: i18n.SECTION_3_CARD_2_TITLE,
    id: ViewAlertsSteps.viewAlerts,
    description: [i18n.EXPLORE_STEP1_DESCRIPTION1, <AlertsButton />],
    splitPanel: (
      <img
        src={viewAlerts}
        alt={i18n.SECTION_3_CARD_2_TASK_1_BUTTON_TITLE}
        height="100%"
        width="100%"
      />
    ),
  },
];

export const sections: Section[] = [
  {
    id: SectionId.quickStart,
    title: i18n.SECTION_1_TITLE,
    cards: [
      {
        id: QuickStartSectionCardsId.createFirstProject,
        steps: createProjectSteps,
        hideSteps: true,
      },
      {
        id: QuickStartSectionCardsId.watchTheOverviewVideo,
        steps: overviewVideoSteps,
      },
    ],
  },
  {
    id: SectionId.addAndValidateYourData,
    title: i18n.SECTION_2_TITLE,
    cards: [
      {
        id: AddAndValidateYourDataCardsId.addIntegrations,
        steps: addIntegrationsSteps,
      },
      {
        id: AddAndValidateYourDataCardsId.viewDashboards,
        steps: viewDashboardSteps,
      },
    ],
  },
  {
    id: SectionId.getStartedWithAlerts,
    title: i18n.SECTION_3_TITLE,
    cards: [
      {
        id: GetStartedWithAlertsCardsId.enablePrebuiltRules,
        steps: enablePrebuildRuleSteps,
      },
      {
        id: GetStartedWithAlertsCardsId.viewAlerts,
        steps: viewAlertSteps,
      },
    ],
  },
];

export const getSections = () => sections;

export const getCardById = (stepId: StepId) => {
  const cards = sections.flatMap((s) => s.cards);
  return cards.find((c) => c.steps?.find((step) => stepId === step.id));
};
