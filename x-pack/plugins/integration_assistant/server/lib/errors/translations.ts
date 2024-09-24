/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RECURSION_LIMIT_ANALYZE_LOGS_ERROR = i18n.translate(
  'xpack.plugins.integration_assistant.server.errors.recursionLimitAnalyzeLogsErrorMessage',
  {
    defaultMessage:
      'Please verify the format of log samples is correct and try again. Try with a fewer samples if error persists.',
  }
);

export const RECURSION_LIMIT_ERROR = i18n.translate(
  'xpack.plugins.integration_assistant.server.errors.recursionLimitReached',
  {
    defaultMessage: 'Max attempts exceeded. Please try again.',
  }
);

export const UNSUPPORTED_LOG_SAMPLES = i18n.translate(
  'xpack.plugins.integration_assistant.server.errors.unsupportedLogSamples',
  {
    defaultMessage: 'Unsupported log format in the samples',
  }
);
