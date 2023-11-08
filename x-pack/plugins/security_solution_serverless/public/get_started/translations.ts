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

export const QUICK_START_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.quickStart.title',
  {
    defaultMessage: 'Quick start',
  }
);

export const CREATE_FIRST_PROJECT_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.createProject.title',
  {
    defaultMessage: 'Create your first project',
  }
);

export const WATCH_THE_OVERVIEW_VIDEO_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideo.title',
  {
    defaultMessage: 'Watch the overview video',
  }
);

export const WATCH_THE_OVERVIEW_VIDEO_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideo.description',
  {
    defaultMessage: `Learn about how Elastic Security’s unified analytics, EDR, and cloud security capabilities help organizations protect their data from attack
    `,
  }
);

export const WATCH_OVERVIEW_VIDEO_MODAL_HEADER = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideoModal.header',
  {
    defaultMessage: 'Welcome to Elastic Security',
  }
);

export const WATCH_OVERVIEW_VIDEO_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideoModal.description',
  {
    defaultMessage:
      'Elastic Security unifies analytics, EDR, cloud security capabilities, and more into a SaaS solution that helps you improve your organization’s security posture, defend against a wide range of threats, and prevent breaches.',
  }
);

export const WATCH_OVERVIEW_VIDEO_CLOSE_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.watchVideoModal.closeButton.title',
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
  'xpack.securitySolutionServerless.getStarted.togglePanel.addIntegrations.title',
  {
    defaultMessage: 'Add integrations',
  }
);

export const ADD_INTEGRATION_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.addIntegrations.description',
  {
    defaultMessage: 'Ingest data via Elastic’s integrations',
  }
);

export const VIEW_AND_ANALYZE_DATA_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.viewAndAnalyze.title',
  {
    defaultMessage: 'View and analyze your data using dashboards',
  }
);

export const VIEW_AND_ANALYZE_DATA_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.viewAndAnalyze.description',
  {
    defaultMessage: 'Stay informed and automatically initiate action',
  }
);

export const GET_STARTED_WITH_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.getStartedWithAlerts.title',
  {
    defaultMessage: 'Get started with alerts',
  }
);

export const ENABLE_PREBUILT_RULES_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.enablePrebuiltRules.title',
  {
    defaultMessage: 'Enable prebuilt rules',
  }
);

export const ENABLE_PREBUILT_RULES_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.enablePrebuiltRules.description',
  {
    defaultMessage:
      'View process data from your Kubernetes clusters and get details in the context of your monitored infrastructure',
  }
);

export const VIEW_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.viewAlerts.title',
  {
    defaultMessage: 'View alerts',
  }
);

export const VIEW_ALERTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.togglePanel.viewAlerts.description',
  {
    defaultMessage:
      'View alerts from across your infrastructure. Examine individual alerts of interest, and discover general patterns in alert volume and severity.',
  }
);
