/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CreateProjectImage } from '../../card_step/content/create_project_step_image';
import { OverviewVideoDescription } from '../../card_step/content/overview_video_description';
import { Video } from '../../card_step/content/video';
import { ManageProjectsButton } from '../../step_links/manage_projects_button';
import * as i18n from './translations';
import type { Section } from './types';
import { CardId, SectionId } from './types';
import overviewVideo from '../../images/overview_video.svg';
import { AddIntegrationsImage } from '../../card_step/content/add_integration_image';
import { AddIntegrationButtons } from '../../step_links/add_integration_buttons';
import {
  autoCheckAddIntegrationsStepCompleted,
  autoCheckPrebuildRuleStepCompleted,
} from '../../card_step/helpers';
import { DashboardButton } from '../../step_links/dashboard_button';
import { ViewDashboardImage } from '../../card_step/content/view_dashboard_image';
import { AddElasticRulesButton } from '../../step_links/add_elastic_rules_button';
import { EnableRuleImage } from '../../card_step/content/enable_rule_image';
import { AlertsButton } from '../../step_links/alerts_link';
import { ViewAlertsImage } from '../../card_step/content/view_alerts_image';

export const sections: Section[] = [
  {
    id: SectionId.quickStart,
    title: i18n.SECTION_1_TITLE,
    cards: [
      {
        id: CardId.createFirstProject,
        title: i18n.CREATE_PROJECT_TITLE,
        icon: { type: 'addDataApp', size: 'xl' as const },
        description: [i18n.CREATE_PROJECT_DESCRIPTION, <ManageProjectsButton />],
        splitPanel: <CreateProjectImage />,
        hideSteps: true,
      },
      {
        id: CardId.getToKnowElasticSecurity,
        icon: { type: overviewVideo, size: 'xl' as const },
        title: i18n.WATCH_VIDEO_TITLE,
        description: [<OverviewVideoDescription />],
        splitPanel: <Video />,
      },
    ],
  },
  {
    id: SectionId.addAndValidateYourData,
    title: i18n.SECTION_2_TITLE,
    cards: [
      {
        icon: { type: 'fleetApp', size: 'xl' as const },
        id: CardId.connectToDataSources,
        title: i18n.ADD_INTEGRATIONS_TITLE,
        description: [i18n.ADD_INTEGRATIONS_DESCRIPTION, <AddIntegrationButtons />],
        splitPanel: <AddIntegrationsImage />,
        autoCheckIfStepCompleted: autoCheckAddIntegrationsStepCompleted,
      },
      {
        id: CardId.analyzeData,
        icon: { type: 'dashboardApp', size: 'xl' as const },
        title: i18n.VIEW_DASHBOARDS,
        description: [i18n.VIEW_DASHBOARDS_DESCRIPTION, <DashboardButton />],
        splitPanel: <ViewDashboardImage />,
      },
    ],
  },
  {
    id: SectionId.getStartedWithAlerts,
    title: i18n.SECTION_3_TITLE,
    cards: [
      {
        title: i18n.ENABLE_RULES,
        icon: { type: 'advancedSettingsApp', size: 'xl' as const },
        id: CardId.enablePrebuiltRules,
        description: [i18n.ENABLE_RULES_DESCRIPTION, <AddElasticRulesButton />],
        splitPanel: <EnableRuleImage />,
        autoCheckIfStepCompleted: autoCheckPrebuildRuleStepCompleted,
      },
      {
        icon: { type: 'watchesApp', size: 'xl' as const },
        title: i18n.VIEW_ALERTS_TITLE,
        id: CardId.viewAlerts,
        description: [i18n.VIEW_ALERTS_DESCRIPTION, <AlertsButton />],
        splitPanel: <ViewAlertsImage />,
      },
    ],
  },
];
