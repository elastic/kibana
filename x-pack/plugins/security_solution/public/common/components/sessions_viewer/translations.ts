/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SESSIONS_TITLE = i18n.translate('xpack.securitySolution.sessionsView.sessionsTitle', {
  defaultMessage: 'Sessions',
});

export const TOTAL_COUNT_OF_SESSIONS = i18n.translate(
  'xpack.securitySolution.sessionsView.totalCountOfSessions',
  {
    defaultMessage: 'sessions',
  }
);

export const SINGLE_COUNT_OF_SESSIONS = i18n.translate(
  'xpack.securitySolution.sessionsView.singleCountOfSessions',
  {
    defaultMessage: 'session',
  }
);

export const COLUMN_SESSION_START = i18n.translate(
  'xpack.securitySolution.sessionsView.columnSessionStart',
  {
    defaultMessage: 'Started',
  }
);

export const COLUMN_EXECUTABLE = i18n.translate(
  'xpack.securitySolution.sessionsView.columnExecutable',
  {
    defaultMessage: 'Executable',
  }
);

export const COLUMN_ENTRY_USER = i18n.translate(
  'xpack.securitySolution.sessionsView.columnEntryUser',
  {
    defaultMessage: 'User',
  }
);

export const COLUMN_INTERACTIVE = i18n.translate(
  'xpack.securitySolution.sessionsView.columnInteractive',
  {
    defaultMessage: 'Interactive',
  }
);

export const COLUMN_HOST_NAME = i18n.translate(
  'xpack.securitySolution.sessionsView.columnHostName',
  {
    defaultMessage: 'Hostname',
  }
);

export const COLUMN_ENTRY_TYPE = i18n.translate(
  'xpack.securitySolution.sessionsView.columnEntryType',
  {
    defaultMessage: 'Type',
  }
);

export const COLUMN_ENTRY_IP = i18n.translate(
  'xpack.securitySolution.sessionsView.columnEntrySourceIp',
  {
    defaultMessage: 'Source IP',
  }
);
