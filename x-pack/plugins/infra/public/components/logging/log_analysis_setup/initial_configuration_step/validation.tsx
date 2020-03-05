/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValidationIndicesError } from '../../../../../common/http_api';

export type ValidationIndicesUIError =
  | ValidationIndicesError
  | { error: 'NETWORK_ERROR' }
  | { error: 'TOO_FEW_SELECTED_INDICES' };

interface ValidIndex {
  validity: 'valid';
  name: string;
  isSelected: boolean;
}

interface InvalidIndex {
  validity: 'invalid';
  name: string;
  errors: ValidationIndicesError[];
}

export type ValidatedIndex = ValidIndex | InvalidIndex;
