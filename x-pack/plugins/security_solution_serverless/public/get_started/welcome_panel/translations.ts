/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const WELCOME_PANEL_PROJECT_CREATED_TITLE = i18n.translate(
  'xpack.securitySolutionServerless.getStarted.welcomePanel.projectCreated.title',
  {
    defaultMessage: `Project created`,
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

export const WELCOME_PANEL_PROGRESS_TRACKER_DESCRIPTION = (tasks: number) =>
  i18n.translate('xpack.securitySolutionServerless.getStarted.welcomePanel.progressTracker.note', {
    defaultMessage: `{tasks, plural, =1 {task} other {tasks}} completed`,
    values: { tasks },
  });
