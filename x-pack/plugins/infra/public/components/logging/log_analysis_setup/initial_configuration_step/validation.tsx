/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValidationIndicesError } from '../../../../../common/http_api';
import { DatasetFilter } from '../../../../../common/log_analysis';

export { ValidationIndicesError };

export type ValidationIndicesUIError =
  | ValidationIndicesError
  | { error: 'NETWORK_ERROR' }
  | { error: 'TOO_FEW_SELECTED_INDICES' };

interface ValidAvailableIndex {
  validity: 'valid';
  name: string;
  isSelected: boolean;
  availableDatasets: string[];
  datasetFilter: DatasetFilter;
}

interface InvalidAvailableIndex {
  validity: 'invalid';
  name: string;
  errors: ValidationIndicesError[];
}

interface UnvalidatedAvailableIndex {
  validity: 'unknown';
  name: string;
}

export type AvailableIndex =
  | ValidAvailableIndex
  | InvalidAvailableIndex
  | UnvalidatedAvailableIndex;
