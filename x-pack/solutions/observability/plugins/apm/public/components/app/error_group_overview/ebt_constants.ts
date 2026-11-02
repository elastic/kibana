/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ERROR_GROUP_OVERVIEW_EBT_ELEMENTS = {
  /** @deprecated Use ERRORS_FROM_LOGS_SECTION and ERRORS_FROM_LOGS_ROW */
  UNPROCESSED_OTEL_ERRORS_PANEL: 'unprocessedOtelErrorsPanel',
  /** @deprecated Use ERRORS_FROM_LOGS_ROW */
  UNPROCESSED_OTEL_ERROR_ROW: 'unprocessedOtelErrorRow',
  ERRORS_FROM_LOGS_SECTION: 'errorsFromLogsSection',
  ERRORS_FROM_LOGS_ROW: 'errorsFromLogsRow',
} as const;
