/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagValidation } from '../../common/validation';

/**
 * Error returned from the server when attributes validation fails for `create` or `update` operations
 */
export interface TagServerValidationError {
  statusCode: 400;
  attributes: TagValidation;
}

export const isServerValidationError = (error: any): error is TagServerValidationError => {
  return (
    error &&
    error.statusCode === 400 &&
    typeof error.attributes?.valid === 'boolean' &&
    typeof error.attributes.errors === 'object'
  );
};
