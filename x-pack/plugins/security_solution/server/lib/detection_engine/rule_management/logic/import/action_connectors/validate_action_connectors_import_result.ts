/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsImportFailure,
  SavedObjectsImportUnknownError,
} from '@kbn/core-saved-objects-common';
import type { BulkError } from '../../../../routes/utils';
import { createBulkErrorObject } from '../../../../routes/utils';

export const mapSOErrorToRuleError = (errors?: SavedObjectsImportFailure[]): BulkError[] => {
  if (!errors) return [];
  return errors.map(({ id, error }) =>
    createBulkErrorObject({
      id,
      statusCode: (error as SavedObjectsImportUnknownError).statusCode,
      message: (error as SavedObjectsImportUnknownError).message,
    })
  );
};
