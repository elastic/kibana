/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom, { Payload } from '@hapi/boom';
import { SavedObjectsImportFailure } from 'src/core/server';

export const createEmptyFailureResponse = (
  errors?: Array<SavedObjectsImportFailure | Boom.Boom>
) => {
  const errorMessages: Array<SavedObjectsImportFailure | Payload> = (errors || []).map((error) => {
    if (Boom.isBoom(error as any)) {
      return (error as Boom.Boom).output.payload as Payload;
    }
    return error as SavedObjectsImportFailure;
  });

  return {
    success: false,
    successCount: 0,
    errors: errorMessages,
  };
};
