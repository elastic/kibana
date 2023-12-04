/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MutableRefObject } from 'react';
import React from 'react';

import type { HttpSetup } from '@kbn/core/public';
import { ENABLED_FIELD } from '@kbn/security-solution-plugin/common';
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

import { AddIntegrationButton } from './step_links/add_integration_button';
import { AlertsButton } from './step_links/alerts_link';
import connectToDataSources from './images/connect_to_existing_sources.png';
import enablePrebuiltRules from './images/enable_prebuilt_rules.png';
import createProjects from './images/create_projects.png';
import viewAlerts from './images/view_alerts.png';
import analyzeDataUsingDashboards from './images/analyze_data_using_dashboards.png';
import { AddElasticRulesButton } from './step_links/add_elastic_rules_button';
import { DashboardButton } from './step_links/dashboard_button';
import overviewVideo from './images/overview_video.svg';
import { Video } from './card_step/video';
import { fetchRuleManagementFilters } from './apis';
import { OverviewVideoDescription } from './card_step/overview_video_description';
import { ManageProjectsButton } from './step_links/manage_projects_button';

export const createProjectSteps = [
  {
    id: CreateProjectSteps.createFirstProject,
    title: i18n.CREATE_PROJECT_TITLE,
    icon: { type: 'addDataApp', size: 'xl' as const },
    description: [i18n.CREATE_PROJECT_DESCRIPTION, <ManageProjectsButton />],
    splitPanel: (
      <img src={createProjects} alt={i18n.CREATE_PROJECT_TITLE} height="100%" width="100%" />
    ),
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
    description: [i18n.ADD_INTEGRATIONS_DESCRIPTION, <AddIntegrationButton />],
    splitPanel: (
      <img
        src={connectToDataSources}
        alt={i18n.ADD_INTEGRATIONS_IMAGE_TITLE}
        height="100%"
        width="100%"
      />
    ),
    autoCheckIfStepCompleted: async ({ indicesExist }: { indicesExist: boolean }) =>
      Promise.resolve(indicesExist),
  },
];

export const viewDashboardSteps = [
  {
    id: ViewDashboardSteps.analyzeData,
    icon: { type: 'dashboardApp', size: 'xl' as const },
    title: i18n.VIEW_DASHBOARDS,
    description: [i18n.VIEW_DASHBOARDS_DESCRIPTION, <DashboardButton />],
    splitPanel: (
      <img
        src={analyzeDataUsingDashboards}
        alt={i18n.VIEW_DASHBOARDS_IMAGE_TITLE}
        height="100%"
        width="100%"
      />
    ),
  },
];

export const enablePrebuildRuleSteps: Array<Step<EnablePrebuiltRulesSteps.enablePrebuiltRules>> = [
  {
    title: i18n.ENABLE_RULES,
    icon: { type: 'advancedSettingsApp', size: 'xl' as const },
    id: EnablePrebuiltRulesSteps.enablePrebuiltRules,
    description: [i18n.ENABLE_RULES_DESCRIPTION, <AddElasticRulesButton />],
    splitPanel: (
      <img src={enablePrebuiltRules} alt={i18n.ENABLE_RULES} height="100%" width="100%" />
    ),
    autoCheckIfStepCompleted: async ({
      abortSignal,
      kibanaServicesHttp,
      onError,
    }: {
      abortSignal: MutableRefObject<AbortController>;
      kibanaServicesHttp: HttpSetup;
      onError?: (e: Error) => void;
    }) => {
      // Check if there are any rules installed and enabled
      try {
        const data = await fetchRuleManagementFilters({
          http: kibanaServicesHttp,
          signal: abortSignal.current.signal,
          query: {
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
            filter: `${ENABLED_FIELD}: true`,
          },
        });
        return data?.total > 0;
      } catch (e) {
        if (!abortSignal.current.signal.aborted) {
          onError?.(e);
        }

        return false;
      }
    },
  },
];

export const viewAlertSteps = [
  {
    icon: { type: 'watchesApp', size: 'xl' as const },
    title: i18n.VIEW_ALERTS_TITLE,
    id: ViewAlertsSteps.viewAlerts,
    description: [i18n.VIEW_ALERTS_DESCRIPTION, <AlertsButton />],
    splitPanel: <img src={viewAlerts} alt={i18n.VIEW_ALERTS_TITLE} height="100%" width="100%" />,
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
