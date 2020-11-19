/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KBN_FIELD_TYPES } from '../../../../../../../../src/plugins/data/public';

import { ML_JOB_FIELD_TYPES } from '../../../../../common/constants/field_types';

export interface FieldRequestConfig {
  fieldName?: string;
  type: ML_JOB_FIELD_TYPES;
  cardinality: number;
}

export interface FieldHistogramRequestConfig {
  fieldName: string;
  type?: KBN_FIELD_TYPES;
}
