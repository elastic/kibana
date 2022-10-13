/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.cancelTitle',
  {
    defaultMessage: 'Cancel',
  }
);

export const OVERWRITE_EXCEPTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.components.importRuleModal.overwriteExceptionLabel',
  {
    defaultMessage: 'Overwrite existing exception lists with conflicting "list_id"',
  }
);

export const SUCCESSFULLY_IMPORTED_EXCEPTIONS = (totalExceptions: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.exceptionsSuccessLabel',
    {
      values: { totalExceptions },
      defaultMessage:
        'Successfully imported {totalExceptions} {totalExceptions, plural, =1 {exception} other {exceptions}}.',
    }
  );

export const IMPORT_FAILED = (totalExceptions: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.components.importRuleModal.importExceptionsFailedLabel',
    {
      values: { totalExceptions },
      defaultMessage:
        'Failed to import {totalExceptions} {totalExceptions, plural, =1 {exception} other {exceptions}}',
    }
  );
