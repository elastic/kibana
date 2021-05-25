/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KBN_FIELD_TYPES } from '../../../../../src/plugins/data/common';
import type { JobFieldType } from './index';

export interface FieldRequestConfig {
  fieldName?: string;
  type: JobFieldType;
  cardinality: number;
}

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}
