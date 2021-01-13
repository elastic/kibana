/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagValidation } from '../../../common';

/**
 * Error returned from {@link TagsClient#create} or {@link TagsClient#update} when tag
 * validation failed.
 */
export class TagValidationError extends Error {
  constructor(message: string, public readonly validation: TagValidation) {
    super(message);
    Object.setPrototypeOf(this, TagValidationError.prototype);
  }
}
