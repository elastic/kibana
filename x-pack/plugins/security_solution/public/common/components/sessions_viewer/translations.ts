/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SESSIONS_DOCUMENT_TYPE = i18n.translate(
  'xpack.securitySolution.sessionsView.sessionsDocumentType',
  {
    defaultMessage: 'sessions',
  }
);

export const TOTAL_COUNT_OF_SESSIONS = i18n.translate(
  'xpack.securitySolution.sessionsView.totalCountOfSessions',
  {
    defaultMessage: 'sessions',
  }
);

export const SESSIONS_TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.sessionsView.sessionsTableTitle',
  {
    defaultMessage: 'Sessions',
  }
);

export const ERROR_FETCHING_SESSIONS_DATA = i18n.translate(
  'xpack.securitySolution.sessionsView.errorFetchingSessionsData',
  {
    defaultMessage: 'Failed to query sessions data',
  }
);
