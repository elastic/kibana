/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { Step, StepId } from './types';
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

import { AddIntegrationButtons } from './step_links/add_integration_buttons';
import { AlertsButton } from './step_links/alerts_link';
import { AddElasticRulesButton } from './step_links/add_elastic_rules_button';
import { DashboardButton } from './step_links/dashboard_button';
import overviewVideo from './images/overview_video.svg';
import { Video } from './card_step/content/video';
import { OverviewVideoDescription } from './card_step/content/overview_video_description';
import { ManageProjectsButton } from './step_links/manage_projects_button';
import { EnableRuleImage } from './card_step/content/enable_rule_image';
import {
  autoCheckAddIntegrationsStepCompleted,
  autoCheckPrebuildRuleStepCompleted,
} from './card_step/helpers';
import { ViewDashboardImage } from './card_step/content/view_dashboard_image';
import { AddIntegrationsImage } from './card_step/content/add_integration_image';
import { CreateProjectImage } from './card_step/content/create_project_step_image';
import { ViewAlertsImage } from './card_step/content/view_alerts_image';

export const createProjectSteps = [
  {
    id: CreateProjectSteps.createFirstProject,
    title: i18n.CREATE_PROJECT_TITLE,
    icon: { type: 'addDataApp', size: 'xl' as const },
    description: [i18n.CREATE_PROJECT_DESCRIPTION, <ManageProjectsButton />],
    splitPanel: <CreateProjectImage />,
  },
];
export const overviewVideoSteps = [
  {
    icon: { type: overviewVideo, size: 'xl' as const },
    title: i18n.WATCH_VIDEO_TITLE,
    id: OverviewSteps.getToKnowElasticSecurity,
    description: [<OverviewVideoDescription />],
    splitPanel: <Video />,
  },
];

export const addIntegrationsSteps: Array<Step<AddIntegrationsSteps.connectToDataSources>> = [
  {
    icon: { type: 'fleetApp', size: 'xl' as const },
    id: AddIntegrationsSteps.connectToDataSources,
    title: i18n.ADD_INTEGRATIONS_TITLE,
    description: [i18n.ADD_INTEGRATIONS_DESCRIPTION, <AddIntegrationButtons />],
    splitPanel: <AddIntegrationsImage />,
    autoCheckIfStepCompleted: autoCheckAddIntegrationsStepCompleted,
  },
];

export const viewDashboardSteps = [
  {
    id: ViewDashboardSteps.analyzeData,
    icon: { type: 'dashboardApp', size: 'xl' as const },
    title: i18n.VIEW_DASHBOARDS,
    description: [i18n.VIEW_DASHBOARDS_DESCRIPTION, <DashboardButton />],
    splitPanel: <ViewDashboardImage />,
  },
];

export const enablePrebuildRuleSteps: Array<Step<EnablePrebuiltRulesSteps.enablePrebuiltRules>> = [
  {
    title: i18n.ENABLE_RULES,
    icon: { type: 'advancedSettingsApp', size: 'xl' as const },
    id: EnablePrebuiltRulesSteps.enablePrebuiltRules,
    description: [i18n.ENABLE_RULES_DESCRIPTION, <AddElasticRulesButton />],
    splitPanel: <EnableRuleImage />,
    autoCheckIfStepCompleted: autoCheckPrebuildRuleStepCompleted,
  },
];

export const viewAlertSteps = [
  {
    icon: { type: 'watchesApp', size: 'xl' as const },
    title: i18n.VIEW_ALERTS_TITLE,
    id: ViewAlertsSteps.viewAlerts,
    description: [i18n.VIEW_ALERTS_DESCRIPTION, <AlertsButton />],
    splitPanel: <ViewAlertsImage />,
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
