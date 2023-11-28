/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_STARTED_PAGE_TITLE = (userName: string) =>
  i18n.translate('xpack.securitySolutionServerless.getStarted.Title', {
    defaultMessage: `Hi {userName}!`,
    values: { userName },
  });

export const GET_STARTED_PAGE_SUBTITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.subTitle',
  {
    defaultMessage: `Get started with Security`,
  }
);

export const GET_STARTED_PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.description',
  {
    defaultMessage: `This area shows you everything you need to know. Feel free to explore all content. You can always come back later at any time.`,
  }
);

export const CURRENT_PLAN_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.currentPlan.label',
  {
    defaultMessage: 'Current plan:',
  }
);

export const PROGRESS_TRACKER_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.progressTracker.progressBar.label',
  { defaultMessage: 'PROGRESS' }
);

export const SECTION_1_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section1.title',
  {
    defaultMessage: 'Quick start',
  }
);

export const SECTION_2_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section2.title',
  {
    defaultMessage: 'Add and validate your data',
  }
);

export const SECTION_3_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section3.title',
  {
    defaultMessage: 'Get started with alerts',
  }
);

export const SECTION_1_CARD_1_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section1.card1.title',
  {
    defaultMessage: 'Create your first project',
  }
);

export const SECTION_1_CARD_2_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section1.card2.title',
  {
    defaultMessage: 'Watch the overview video',
  }
);

export const SECTION_1_CARD_2_TITLE_TASK_1_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section1.card2.task1.button.title',
  {
    defaultMessage: 'Elastic Security',
  }
);

export const SECTION_2_CARD_1_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section2.card1.title',
  {
    defaultMessage: 'Add integrations',
  }
);

export const SECTION_2_CARD_1_TITLE_TASK_1_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section2.card1.task1.button.title',
  {
    defaultMessage: 'Connect to existing data sources',
  }
);

export const SECTION_2_CARD_2_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section2.card2.title',
  {
    defaultMessage: 'View and analyze your data using dashboards',
  }
);

export const SECTION_2_CARD_2_TASK_1_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section2.card2.task1.button.title',
  {
    defaultMessage: 'Analyze data using dashboards',
  }
);

export const INTRODUCTION_STEP1_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.step1.description1',
  {
    defaultMessage: `Elastic Security unifies analytics, EDR, cloud security capabilities, and more into a SaaS solution that helps you improve your organization’s security posture, defend against a wide range of threats, and prevent breaches.
    `,
  }
);

export const INTRODUCTION_STEP1_DESCRIPTION2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.step1.description2',
  {
    defaultMessage: `To explore the platform’s core features, watch the video:`,
  }
);

export const PRODUCT_BADGE_ANALYTICS = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.productBadge.analytics',
  {
    defaultMessage: 'Analytics',
  }
);

export const PRODUCT_BADGE_CLOUD = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.productBadge.cloud',
  {
    defaultMessage: 'Cloud',
  }
);

export const PRODUCT_BADGE_EDR = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.productBadge.edr',
  {
    defaultMessage: 'EDR',
  }
);

export const CONFIGURE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.title',
  {
    defaultMessage: 'Configure',
  }
);

export const CONFIGURE_STEP1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1',
  {
    defaultMessage: 'Learn about Elastic Agent',
  }
);

export const CONFIGURE_STEP1_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1.description1',
  {
    defaultMessage:
      'Deploy the Elastic Agent to each endpoint you want to protect. This allows it to monitor and protect them by collecting data and enforcing your security policies. It sends that data to the Elastic Stack for analysis and storage.',
  }
);

export const CONFIGURE_STEP1_DESCRIPTION2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1.description2',
  {
    defaultMessage: 'In the next step, you will deploy the Elastic Agent to your endpoints.',
  }
);

export const CONFIGURE_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2',
  {
    defaultMessage: 'Deploy Elastic Agent to protect your endpoints',
  }
);

export const CONFIGURE_STEP2_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2.description1',
  {
    defaultMessage: 'Deploy the Elastic Agent to each endpoint you want to monitor or protect.',
  }
);

export const CONFIGURE_STEP3_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.description1',
  {
    defaultMessage:
      'Use third-party integrations to import data from common sources and help you gather relevant information in one place. To find integrations for your use case, search for tools and data providers on the Add integrations page.',
  }
);

export const SECTION_3_CARD_1_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section3.card1.title',
  {
    defaultMessage: 'Enable prebuilt rules',
  }
);

export const SECTION_3_CARD_1_TASK_1_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section3.card1.task1.button.title',
  {
    defaultMessage: 'Enable prebuilt rules',
  }
);

export const SECTION_3_CARD_2_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section3.card2.title',
  {
    defaultMessage: 'View alerts',
  }
);

export const SECTION_3_CARD_2_TASK_1_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section3.card2.task1.button.title',
  {
    defaultMessage: 'View alerts',
  }
);

export const CONFIGURE_STEP4_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description1',
  {
    defaultMessage:
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are met.',
  }
);

export const EXPLORE_STEP1_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1.description1',
  {
    defaultMessage:
      'Visualize, sort, filter, and investigate alerts from across your infrastructure. Examine individual alerts of interest, and discover general patterns in alert volume and severity.',
  }
);

export const EXPLORE_STEP2_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description1',
  {
    defaultMessage:
      'Use dashboards to visualize data and stay up-to-date with key information. Create your own, or use Elastic’s default dashboards — including alerts, user authentication events, known vulnerabilities, and more.',
  }
);

export const TOGGLE_PANEL_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStartedProductLabel.title',
  {
    defaultMessage: `Curate your Get Started experience:`,
  }
);

export const ANALYTICS_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.switch.analytics.label',
  {
    defaultMessage: 'Analytics',
  }
);

export const CLOUD_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.switch.cloud.label',

  {
    defaultMessage: 'Cloud Security',
  }
);

export const ENDPOINT_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.switch.endpoint.label',
  {
    defaultMessage: 'Endpoint Security',
  }
);

export const MARK_AS_DONE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.markAsDoneTitle',
  {
    defaultMessage: 'Mark as done',
  }
);

export const UNDO_MARK_AS_DONE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.undoMarkAsDoneTitle',
  {
    defaultMessage: `Undo 'mark as done'`,
  }
);

export const TOGGLE_PANEL_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.empty.title',
  {
    defaultMessage: `Hmm, there doesn't seem to be anything there`,
  }
);

export const TOGGLE_PANEL_EMPTY_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.empty.description',
  {
    defaultMessage: `Switch on a toggle to continue your curated "Get Started" experience`,
  }
);

export const ALL_DONE_TEXT = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.done.title',
  {
    defaultMessage: 'Step complete',
  }
);

export const COLLAPSE_STEP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.collapseStepButton.label',
  {
    defaultMessage: 'Collapse',
  }
);

export const EXPAND_STEP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.expandStepButton.label',
  {
    defaultMessage: 'Expand',
  }
);
