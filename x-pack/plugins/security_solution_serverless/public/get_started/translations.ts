/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GET_STARTED_PAGE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.title',
  {
    defaultMessage: `Welcome`,
  }
);

export const GET_STARTED_PAGE_SUBTITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.subTitle',
  {
    defaultMessage: `Let's get started`,
  }
);

export const GET_STARTED_PAGE_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.description',
  {
    defaultMessage: `Set up your Elastic Security workspace.  Use the toggles below to curate a list of tasks that best fits your environment`,
  }
);

export const WELCOME_PANEL_PROJECT_CREATED_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.welcomePanel.projectCreated.title',
  {
    defaultMessage: `Project created`,
  }
);

export const WELCOME_PANEL_PROJECT_CREATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.welcomePanel.projectCreated.description',
  {
    defaultMessage: `View all projects here.`,
  }
);

export const WELCOME_PANEL_INVITE_YOUR_TEAM_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.welcomePanel.inviteYourTeam.title',
  {
    defaultMessage: 'Invite your team',
  }
);

export const WELCOME_PANEL_INVITE_YOUR_TEAM_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.welcomePanel.inviteYourTeam.description',
  {
    defaultMessage: `Boost security through collaboration`,
  }
);

export const WELCOME_PANEL_PROGRESS_TRACKER_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.welcomePanel.progressTracker.title',
  {
    defaultMessage: 'Progress tracker',
  }
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

export const GET_SET_UP_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getSetUp.title',
  {
    defaultMessage: 'Get set up',
  }
);

export const INTRODUCTION_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.title',
  {
    defaultMessage: 'Introduction',
  }
);

export const INTRODUCTION_STEP1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.step',
  {
    defaultMessage: 'Get to know Elastic Security',
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

export const WATCH_OVERVIEW_VIDEO_HEADER = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getToKnowElasticSecurity.header',
  {
    defaultMessage: 'Elastic Security',
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
    defaultMessage: 'Learn about agent + policy',
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
    defaultMessage:
      'In order to begin detecting security misconfigurations, you’ll need to deploy Elastic Agent to the cloud account or Kubernetes cluster you want to monitor.',
  }
);

export const CONFIGURE_STEP2_BUTTON = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2.button.title',
  {
    defaultMessage: 'Install Agent',
  }
);

export const CONFIGURE_STEP3 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3',
  {
    defaultMessage: 'Connect to existing data sources',
  }
);

export const CONFIGURE_STEP3_BUTTON = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.button.title',
  {
    defaultMessage: 'Add integrations',
  }
);

export const CONFIGURE_STEP4 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4',
  {
    defaultMessage: 'Enable pre-built rules',
  }
);

export const CONFIGURE_STEP4_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description1',
  {
    defaultMessage:
      'Elastic Security comes with prebuilt detection rules that run in the background and create alerts when their conditions are  met.',
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

export const EXPLORE_STEP1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1',
  {
    defaultMessage: 'View alerts',
  }
);

export const EXPLORE_STEP1_BUTTON = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1.button.title',
  {
    defaultMessage: 'View alerts',
  }
);

export const EXPLORE_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2',
  {
    defaultMessage: 'Analyze data dashboards',
  }
);

export const EXPLORE_STEP2_BUTTON = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.button.title',
  {
    defaultMessage: 'Go to dashboards',
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

export const MASTER_THE_INVESTIGATION_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.masterTheInvestigationsWorkflow.title',
  {
    defaultMessage: 'Master the investigations workflow',
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

export const RESPOND_TO_THREATS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.respondToThreatsWithAutomation.title',
  {
    defaultMessage: 'Respond to threats with automation',
  }
);

export const RESPOND_TO_THREATS_STEP1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.respondToThreatsWithAutomation.step1',
  {
    defaultMessage: 'Automate response actions with rules',
  }
);

export const RESPOND_TO_THREATS_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.respondToThreatsWithAutomation.step1',
  {
    defaultMessage: 'Take control of your endpoints with the Response Console',
  }
);

export const OPTIMIZE_YOUR_WORKSPACE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.optimizeYourWorkspace.title',
  {
    defaultMessage: 'Optimize your workspace',
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
