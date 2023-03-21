/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.tableTitle',
  {
    defaultMessage: 'Execution log',
  }
);

export const TABLE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.tableSubtitle',
  {
    defaultMessage: 'A detailed log of rule execution events',
  }
);

export const COLUMN_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.timestampColumn',
  {
    defaultMessage: 'Timestamp',
  }
);

export const COLUMN_LOG_LEVEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.logLevelColumn',
  {
    defaultMessage: 'Level',
  }
);

export const COLUMN_EVENT_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.eventTypeColumn',
  {
    defaultMessage: 'Type',
  }
);

export const COLUMN_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.messageColumn',
  {
    defaultMessage: 'Message',
  }
);

export const FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.fetchErrorDescription',
  {
    defaultMessage: 'Failed to fetch rule execution events',
  }
);

export const ROW_DETAILS_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.rowDetails.messageTitle',
  {
    defaultMessage: 'Message',
  }
);

export const ROW_DETAILS_JSON = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.executionEventsTable.rowDetails.jsonTitle',
  {
    defaultMessage: 'Full JSON',
  }
);
