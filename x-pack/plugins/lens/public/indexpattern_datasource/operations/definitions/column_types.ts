/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Operation } from '../../../types';

/**
 * This is the root type of a column. If you are implementing a new
 * operation, extend your column type on `BaseIndexPatternColumn` to make
 * sure it's matching all the basic requirements.
 */
export interface BaseIndexPatternColumn extends Operation {
  // Private
  operationType: string;
  customLabel?: boolean;
}

// Formatting can optionally be added to any column
export interface FormattedIndexPatternColumn extends BaseIndexPatternColumn {
  params?: {
    format: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export interface FieldBasedIndexPatternColumn extends BaseIndexPatternColumn {
  sourceField: string;
}
