/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_STARTED_PAGE_TITLE = (userName: string) =>
  i18n.translate('xpack.securitySolution.onboarding.Title', {
    defaultMessage: `Hi {userName}!`,
    values: { userName },
  });

export const GET_STARTED_PAGE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.onboarding.subTitle',
  {
    defaultMessage: `Get started with Security`,
  }
);

export const GET_STARTED_PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.description',
  {
    defaultMessage: `This area shows you everything you need to know. Feel free to explore all content. You can always come back here at any time.`,
  }
);

export const CURRENT_PLAN_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.currentPlan.label',
  {
    defaultMessage: 'Current plan:',
  }
);

export const CURRENT_TIER_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.currentTier.label',
  {
    defaultMessage: 'Current tier:',
  }
);

export const PROGRESS_TRACKER_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.progressTracker.progressBar.label',
  { defaultMessage: 'PROGRESS' }
);

export const SECTION_1_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.section1.title',
  {
    defaultMessage: 'Quick start',
  }
);

export const SECTION_2_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.section2.title',
  {
    defaultMessage: 'Add and validate your data',
  }
);

export const SECTION_3_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.section3.title',
  {
    defaultMessage: 'Get started with alerts',
  }
);

export const CREATE_PROJECT_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.createProject.title',
  {
    defaultMessage: 'Create your first project',
  }
);

export const CREATE_PROJECT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.createProject.description',
  {
    defaultMessage: `Create Elastic Security project with our fully-managed serverless solutions that automatically manage nodes, shards, data tiers and scaling to maintain the health and performance so you can focus on your data and goals.`,
  }
);

export const WATCH_VIDEO_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.watchVideo.title',
  {
    defaultMessage: 'Watch the overview video',
  }
);

export const WATCH_VIDEO_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.watchVideo.button.title',
  {
    defaultMessage: 'Elastic Security',
  }
);

export const WATCH_VIDEO_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolution.onboarding.step.watchVideo.description1',
  {
    defaultMessage: `Elastic Security unifies analytics, EDR, cloud security capabilities, and more into a SaaS solution that helps you improve your organization’s security posture, defend against a wide range of threats, and prevent breaches.
    `,
  }
);

export const WATCH_VIDEO_DESCRIPTION2 = i18n.translate(
  'xpack.securitySolution.onboarding.step.watchVideo.description2',
  {
    defaultMessage: `To explore the platform’s core features, watch the video:`,
  }
);

export const ADD_INTEGRATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.title',
  {
    defaultMessage: 'Add data with integrations',
  }
);

export const ADD_INTEGRATIONS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.description',
  {
    defaultMessage:
      'Use integrations to import data from common sources and help you gather relevant information in one place.',
  }
);

export const ADD_INTEGRATIONS_IMAGE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.addIntegrations.image.title',
  {
    defaultMessage: 'Connect to existing data sources',
  }
);

export const VIEW_DASHBOARDS = i18n.translate(
  'xpack.securitySolution.onboarding.step.viewDashboards.title',
  {
    defaultMessage: 'View and analyze your data using dashboards',
  }
);

export const VIEW_DASHBOARDS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.viewDashboards.description',
  {
    defaultMessage:
      'Use dashboards to visualize data and stay up-to-date with key information. Create your own, or use Elastic’s default dashboards — including alerts, user authentication events, known vulnerabilities, and more.',
  }
);

export const VIEW_DASHBOARDS_IMAGE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.viewDashboards.image.title',
  {
    defaultMessage: 'Analyze data using dashboards',
  }
);

export const ENABLE_RULES = i18n.translate(
  'xpack.securitySolution.onboarding.step.enableRules.title',
  {
    defaultMessage: 'Enable prebuilt rules',
  }
);

export const ENABLE_RULES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.enableRules.description',
  {
    defaultMessage:
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are met.',
  }
);

export const VIEW_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.step.viewAlerts.title',
  {
    defaultMessage: 'View alerts',
  }
);

export const VIEW_ALERTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.step.viewAlerts.description',
  {
    defaultMessage:
      'Visualize, sort, filter, and investigate alerts from across your infrastructure. Examine individual alerts of interest, and discover general patterns in alert volume and severity.',
  }
);

export const PRODUCT_BADGE_ANALYTICS = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.productBadge.analytics',
  {
    defaultMessage: 'Analytics',
  }
);

export const PRODUCT_BADGE_CLOUD = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.productBadge.cloud',
  {
    defaultMessage: 'Cloud',
  }
);

export const PRODUCT_BADGE_EDR = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.productBadge.edr',
  {
    defaultMessage: 'EDR',
  }
);

export const TOGGLE_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.onboardingProductLabel.title',
  {
    defaultMessage: `Curate your Get Started experience:`,
  }
);

export const ANALYTICS_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.switch.analytics.label',
  {
    defaultMessage: 'Analytics',
  }
);

export const CLOUD_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.switch.cloud.label',

  {
    defaultMessage: 'Cloud Security',
  }
);

export const ENDPOINT_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.switch.endpoint.label',
  {
    defaultMessage: 'Endpoint Security',
  }
);

export const MARK_AS_DONE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.markAsDoneTitle',
  {
    defaultMessage: 'Mark as done',
  }
);

export const UNDO_MARK_AS_DONE_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.undoMarkAsDoneTitle',
  {
    defaultMessage: `Undo 'mark as done'`,
  }
);

export const TOGGLE_PANEL_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.empty.title',
  {
    defaultMessage: `Hmm, there doesn't seem to be anything there`,
  }
);

export const TOGGLE_PANEL_EMPTY_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.empty.description',
  {
    defaultMessage: `Switch on a toggle to continue your curated "Get Started" experience`,
  }
);

export const ALL_DONE_TEXT = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.done.title',
  {
    defaultMessage: 'Step complete',
  }
);

export const COLLAPSE_STEP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.collapseStepButton.label',
  {
    defaultMessage: 'Collapse',
  }
);

export const EXPAND_STEP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.onboarding.togglePanel.expandStepButton.label',
  {
    defaultMessage: 'Expand',
  }
);
