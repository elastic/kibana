/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULES_DATA_INPUT_FILE_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.title',
  { defaultMessage: 'Update your rule export' }
);
export const RULES_DATA_INPUT_FILE_UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.prompt',
  { defaultMessage: 'Select or drag and drop the exported JSON file' }
);

export const RULES_DATA_INPUT_FILE_UPLOAD_ERROR = {
  CAN_NOT_READ: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.canNotRead',
    { defaultMessage: 'Failed to read the rules export file' }
  ),
  CAN_NOT_READ_WITH_REASON: (reason: string) =>
    i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.canNotReadWithReason',
      {
        defaultMessage: 'An error occurred when reading rules export file: {reason}',
        values: { reason },
      }
    ),
  CAN_NOT_PARSE: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.canNotParse',
    { defaultMessage: 'Cannot parse the rules export file as either a JSON file' }
  ),
  TOO_LARGE_TO_PARSE: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.tooLargeToParse',
    { defaultMessage: 'This rules export file is too large to parse' }
  ),
  NOT_ARRAY: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.notArray',
    { defaultMessage: 'The rules export file is not an array' }
  ),
  EMPTY: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.empty',
    { defaultMessage: 'The rules export file is empty' }
  ),
  NOT_OBJECT: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.notObject',
    { defaultMessage: 'The rules export file contains non-object entries' }
  ),
  WRONG_FORMAT: (formatError: string) => {
    return i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.error.wrongFormat',
      {
        defaultMessage: 'The rules export file has wrong format: {formatError}',
        values: { formatError },
      }
    );
  },
};

export const RULES_DATA_INPUT_CREATE_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.createSuccess',
  { defaultMessage: 'Rules uploaded successfully' }
);
export const RULES_DATA_INPUT_CREATE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.createError',
  { defaultMessage: 'Failed to upload rules file' }
);
