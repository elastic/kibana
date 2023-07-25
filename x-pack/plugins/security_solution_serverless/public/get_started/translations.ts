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

export const INTRODUCTION_STEP = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.introduction.step',
  {
    defaultMessage: 'Get to know Elastic Security',
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

export const WATCH_OVERVIEW_VIDEO_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getToKnowElasticSecurity.description1',
  {
    defaultMessage: `Elastic security keeps your organization’s data safe from attack. `,
  }
);

export const WATCH_OVERVIEW_VIDEO_DESCRIPTION2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getToKnowElasticSecurity.description2',
  {
    defaultMessage: `Our unified security platform combines Analytics, EDR, and cloud security capabilities into a single SaaS product, providing organizations with a comprehensive solution to protect against a wide range of security threats. With centralized management, real-time threat detection and response, and scalability, our platform can help organizations improve their security posture and reduce the risk of data breaches.`,
  }
);

export const WATCH_OVERVIEW_VIDEO_DESCRIPTION3 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getToKnowElasticSecurity.description3',
  {
    defaultMessage: `Watch the video to explore the core features that allow you to keep your data safe.`,
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

export const CONFIGURE_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2',
  {
    defaultMessage: 'Deploy Elastic Agent to protect your endpoints',
  }
);

export const CONFIGURE_STEP3 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3',
  {
    defaultMessage: 'Connect to existing data sources',
  }
);

export const CONFIGURE_STEP4 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4',
  {
    defaultMessage: 'Enable pre-built rules',
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

export const EXPLORE_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2',
  {
    defaultMessage: 'Analyze data dashboards',
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

export const RESPOND_TO_THREATS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.respondToThreatsWithAutomation.title',
  {
    defaultMessage: 'Respond to threats with automation',
  }
);

export const OPTIMIZE_YOUR_WORKSPACE_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.optimizeYourWorkspace.title',
  {
    defaultMessage: 'Optimize your workspace',
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
