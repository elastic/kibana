/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { Operation } from '../../../types';
import { TimeScaleUnit } from '../../time_scale';

export interface BaseIndexPatternColumn extends Operation {
  // Private
  operationType: string;
  customLabel?: boolean;
  timeScale?: TimeScaleUnit;
}

// Formatting can optionally be added to any column
// export interface FormattedIndexPatternColumn extends BaseIndexPatternColumn {
export type FormattedIndexPatternColumn = BaseIndexPatternColumn & {
  params?: {
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
};

export interface FieldBasedIndexPatternColumn extends BaseIndexPatternColumn {
  sourceField: string;
}

export interface ReferenceBasedIndexPatternColumn
  extends BaseIndexPatternColumn,
    FormattedIndexPatternColumn {
  references: string[];
}

// Used to store the temporary invalid state
export interface IncompleteColumn {
  operationType?: string;
  sourceField?: string;
}
