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

export const PROGRESS_TRACKER_LABEL = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.progressTracker.label',
  { defaultMessage: 'Progress' }
);

export const STEP_TIME_MIN = (min: number) =>
  i18n.translate(
    'xpack.securitySolutionServerless.getStarted.togglePanel.progressTracker.stepTimeMin',
    {
      defaultMessage: 'About {min} {min, plural, =1 {min} other {mins}}',
      values: { min },
    }
  );

export const STEPS_LEFT = (steps: number) =>
  i18n.translate(
    'xpack.securitySolutionServerless.getStarted.togglePanel.progressTracker.stepsLeft',
    {
      defaultMessage: '{steps} {steps, plural, =1 {step} other {steps}} left',
      values: { steps },
    }
  );

export const QUICK_START_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getSetUp.title',
  {
    defaultMessage: 'Quick start',
  }
);

export const INTRODUCTION_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.title',
  {
    defaultMessage: 'Introduction',
  }
);

export const CREATE_FIRST_PROJECT_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.step1',
  {
    defaultMessage: 'Create your first project',
  }
);

export const WATCH_THE_OVERVIEW_VIDEO_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.step2',
  {
    defaultMessage: 'Watch the overview video',
  }
);

export const WATCH_THE_OVERVIEW_VIDEO_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.step1.description1',
  {
    defaultMessage: `Learn about how Elastic Security’s unified analytics, EDR, and cloud security capabilities help organizations protect their data from attack
    `,
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

export const WATCH_OVERVIEW_VIDEO_HEADER = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideo.header',
  {
    defaultMessage: 'Elastic Security',
  }
);

export const WATCH_OVERVIEW_VIDEO_MODAL_HEADER = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideoModal.header',
  {
    defaultMessage: 'Welcome to Elastic Security',
  }
);

export const WATCH_OVERVIEW_VIDEO_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideo.description',
  {
    defaultMessage:
      'Elastic Security unifies analytics, EDR, cloud security capabilities, and more into a SaaS solution that helps you improve your organization’s security posture, defend against a wide range of threats, and prevent breaches.',
  }
);

export const WATCH_OVERVIEW_VIDEO_CLOSE_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideo.closeButton.title',
  {
    defaultMessage: 'Close',
  }
);

export const ADD_AND_VALIDATE_DATA_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.section.addAndValidate.title',
  {
    defaultMessage: 'Add and validate your data',
  }
);

export const CONFIGURE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.title',
  {
    defaultMessage: 'Configure',
  }
);

export const START_BUTTON_TEXT = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.startButton.title',
  {
    defaultMessage: 'Start',
  }
);

export const ALL_DONE_TEXT = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.done.title',
  {
    defaultMessage: 'All done here!',
  }
);

export const ADD_INTEGRATION_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1',
  {
    defaultMessage: 'Add integrations',
  }
);

export const ADD_INTEGRATION_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1.description1',
  {
    defaultMessage: 'Ingest data via Elastic’s integrations',
  }
);

export const CONFIGURE_STEP1_DESCRIPTION2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1.description2',
  {
    defaultMessage: 'In the next step, you will deploy the Elastic Agent to your endpoints.',
  }
);

export const VIEW_AND_ANALYZE_DATA_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2',
  {
    defaultMessage: 'View and analyze your data using dashboards',
  }
);

export const VIEW_AND_ANALYZE_DATA_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2.description1',
  {
    defaultMessage: 'Stay informed and automatically initiate action',
  }
);

export const CONFIGURE_STEP3 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3',
  {
    defaultMessage: 'Connect to existing data sources',
  }
);

export const CONFIGURE_STEP3_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.description1',
  {
    defaultMessage:
      'Use third-party integrations to import data from common sources and help you gather relevant information in one place. To find integrations for your use case, search for tools and data providers on the Add integrations page.',
  }
);

export const CONFIGURE_STEP3_BUTTON = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.button.title',
  {
    defaultMessage: 'Go to integrations',
  }
);

export const CONFIGURE_STEP4 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4',
  {
    defaultMessage: 'Enable prebuilt rules',
  }
);

export const CONFIGURE_STEP4_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description1',
  {
    defaultMessage:
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are met.',
  }
);

export const CONFIGURE_STEP4_BUTTON = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.button.title',
  {
    defaultMessage: 'Add Elastic rules',
  }
);

export const EXPLORE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.title',
  {
    defaultMessage: 'Explore',
  }
);

export const ENABLE_PREBUILT_RULES_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1',
  {
    defaultMessage: 'Enable prebuilt rules',
  }
);

export const GET_STARTED_WITH_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getStartedWithAlerts.title',
  {
    defaultMessage: 'Get started with alerts',
  }
);

export const ENABLE_PREBUILT_RULES_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1.description1',
  {
    defaultMessage:
      'View process data from your Kubernetes clusters and get details in the context of your monitored infrastructure',
  }
);

export const VIEW_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2',
  {
    defaultMessage: 'View alerts',
  }
);

export const VIEW_ALERTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description1',
  {
    defaultMessage:
      'View alerts from across your infrastructure. Examine individual alerts of interest, and discover general patterns in alert volume and severity.',
  }
);

export const PROTECT_YOUR_ENVIRONMENT_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.protectYourEnvironmentInRealtime.title',
  {
    defaultMessage: 'Protect your environment in realtime',
  }
);

export const GET_MORE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getMoreFromElasticSecurity.title',
  {
    defaultMessage: 'Get more from Elastic Security',
  }
);

export const MASTER_THE_INVESTIGATION_STEP1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.masterTheInvestigationsWorkflow.step1',
  {
    defaultMessage: 'Introduction to investigations',
  }
);

export const MASTER_THE_INVESTIGATION_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.masterTheInvestigationsWorkflow.step2',
  {
    defaultMessage: 'Explore process lineage with Analyzer',
  }
);

export const MASTER_THE_INVESTIGATION_STEP3 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.masterTheInvestigationsWorkflow.step3',
  {
    defaultMessage: 'Explore user and process activity with Session View',
  }
);

export const MASTER_THE_INVESTIGATION_STEP4 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.masterTheInvestigationsWorkflow.step4',
  {
    defaultMessage: 'Explore threat hunting in Timeline',
  }
);

export const MASTER_THE_INVESTIGATION_STEP5 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.masterTheInvestigationsWorkflow.step5',
  {
    defaultMessage: 'Introduction to cases',
  }
);

export const RESPOND_TO_THREATS_STEP1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.respondToThreatsWithAutomation.step1',
  {
    defaultMessage: 'Automate response actions with rules',
  }
);

export const RESPOND_TO_THREATS_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.respondToThreatsWithAutomation.step2',
  {
    defaultMessage: 'Take control of your endpoints with the Response Console',
  }
);

export const OPTIMIZE_YOUR_WORKSPACE_STEP1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.optimizeYourWorkspace.step1',
  {
    defaultMessage: 'Enable Threat Intelligence',
  }
);

export const OPTIMIZE_YOUR_WORKSPACE_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.optimizeYourWorkspace.step2',
  {
    defaultMessage: 'Enable Entity Analytics',
  }
);

export const OPTIMIZE_YOUR_WORKSPACE_STEP3 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.optimizeYourWorkspace.step3',
  {
    defaultMessage: 'Create custom rules',
  }
);

export const OPTIMIZE_YOUR_WORKSPACE_STEP4 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.optimizeYourWorkspace.step4',
  {
    defaultMessage: 'Introduction to exceptions',
  }
);

export const OPTIMIZE_YOUR_WORKSPACE_STEP5 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.optimizeYourWorkspace.step5',
  {
    defaultMessage: 'Connect notification systems to get alerts in real-time',
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
