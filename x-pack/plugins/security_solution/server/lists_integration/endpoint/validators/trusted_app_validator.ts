/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseValidator } from './base_validator';

export class TrustedAppValidator extends BaseValidator {
  // 0. do we need to validate user authz? if so, need the `request` from Lists
  //
  // 1. can create per-policy entries
  //
  // 2. validate data is valid (retrieve prior schema for this one)
  //
  // 3. Validate that policy IDs (for per-policy entry) are valid
  //
}

export const validateTrustedAppPreCreate = () => {};
