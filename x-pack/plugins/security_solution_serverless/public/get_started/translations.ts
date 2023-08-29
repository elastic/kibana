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
    defaultMessage: 'Learn about Elastic Agent and Fleet',
  }
);

export const CONFIGURE_STEP1_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step1.description1',
  {
    defaultMessage:
      'Elastic Agent is a single, unified way to add monitoring for logs, metrics, and other types of data to a host. It can also protect hosts from security threats, query data from operating systems, forward data from remote services or hardware, and more.',
  }
);

export const CONFIGURE_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2',
  {
    defaultMessage: 'Deploy Elastic Defend to protect your endpoints',
  }
);

export const CONFIGURE_STEP2_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2.description1',
  {
    defaultMessage:
      'Elastic Defend provides organizations with prevention, detection, and response capabilities with deep visibility for EPP, EDR, SIEM, and Security Analytics use cases across Windows, macOS, and Linux operating systems running on both traditional endpoints and public cloud environments.',
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
      'Elastic integrations provide an easy way to connect Elastic to external services and systems, and quickly get insights or take action. They can collect new sources of data, and they often ship with out-of-the-box assets like dashboards, visualizations, and pipelines to extract structured fields out of logs and events.',
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
    defaultMessage: 'Enable prebuilt rules or create your own',
  }
);

export const CONFIGURE_STEP4_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description1',
  {
    defaultMessage:
      'Rules run periodically and search for suspicious events, sequences, machine learning anomalies, and more! When a rule’s criteria are met, a detection alert is created.',
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

export const EXPLORE_STEP1_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step1.description1',
  {
    defaultMessage:
      'The Alerts page displays all detection alerts following rule configuration from above. From the Alerts page, you can prioritize, triage, investigate alerts, and escalate alerts to a Case. Rules must be enabled for any alerts to be created.',
  }
);

export const EXPLORE_STEP2 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2',
  {
    defaultMessage: 'Analyze data dashboards',
  }
);

export const EXPLORE_STEP2_DESCRIPTION1 = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.explore.step2.description1',
  {
    defaultMessage:
      'The Overview dashboard provides a high-level snapshot of alerts and events. It helps you assess overall system health and find anomalies that may require further investigation.',
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
