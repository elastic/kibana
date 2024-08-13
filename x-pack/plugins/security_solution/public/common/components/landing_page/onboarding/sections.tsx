/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { SectionId, type Section, CardId } from './types';
import * as i18n from './translations';

import { AddIntegrationButtons } from './step_links/add_integration_buttons';
import { AlertsButton } from './step_links/alerts_link';
import { AddElasticRulesButton } from './step_links/add_elastic_rules_button';
import { DashboardButton } from './step_links/dashboard_button';
import overviewVideo from './images/overview_video.svg';
import { Video } from './card_wrapper/content/video';
import { OverviewVideoDescription } from './card_wrapper/content/overview_video_description';
import { ManageProjectsButton } from './step_links/manage_projects_button';
import { EnableRuleImage } from './card_wrapper/content/enable_rule_image';
import {
  autoCheckAddIntegrationsStepCompleted,
  autoCheckPrebuildRuleStepCompleted,
} from './card_wrapper/helpers';
import { ViewDashboardImage } from './card_wrapper/content/view_dashboard_image';
import { AddIntegrationsImage } from './card_wrapper/content/add_integration_image';
import { CreateProjectImage } from './card_wrapper/content/create_project_step_image';
import { ViewAlertsImage } from './card_wrapper/content/view_alerts_image';

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
      },
      {
        id: CardId.watchTheOverviewVideo,
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
        id: CardId.addIntegrations,
        icon: { type: 'fleetApp', size: 'xl' as const },
        title: i18n.ADD_INTEGRATIONS_TITLE,
        description: [i18n.ADD_INTEGRATIONS_DESCRIPTION, <AddIntegrationButtons />],
        splitPanel: <AddIntegrationsImage />,
        autoCheckIfCardCompleted: autoCheckAddIntegrationsStepCompleted,
      },
      {
        id: CardId.viewDashboards,
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
        id: CardId.enablePrebuiltRules,
        title: i18n.ENABLE_RULES,
        icon: { type: 'advancedSettingsApp', size: 'xl' as const },
        description: [i18n.ENABLE_RULES_DESCRIPTION, <AddElasticRulesButton />],
        splitPanel: <EnableRuleImage />,
        autoCheckIfCardCompleted: autoCheckPrebuildRuleStepCompleted,
      },
      {
        id: CardId.viewAlerts,
        icon: { type: 'watchesApp', size: 'xl' as const },
        title: i18n.VIEW_ALERTS_TITLE,
        description: [i18n.VIEW_ALERTS_DESCRIPTION, <AlertsButton />],
        splitPanel: <ViewAlertsImage />,
      },
    ],
  },
];

export const getSections = () => sections;

export const getSectionById = (sectionId: SectionId) => {
  return sections.find((s) => s.id === sectionId);
};

export const getCards = () => sections.flatMap((s) => s.cards);

export const getCardById = (cardId: CardId) => {
  const cards = sections.flatMap((s) => s.cards);
  return cards.find((c) => c.id === cardId);
};
