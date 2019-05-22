/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../common/constants/field_types';
import { ML_JOB_AGGREGATION } from '../../common/constants/aggregation_types';

export type FieldId = string;
export type AggId = ML_JOB_AGGREGATION;
export type SplitField = Field | null;

export interface Field {
  id: FieldId;
  name: string;
  type: ES_FIELD_TYPES;
  aggregatable: boolean;
  aggIds?: AggId[];
  aggs?: Aggregation[];
}

export interface Aggregation {
  id: AggId;
  title: string;
  kibanaName: string;
  dslName: string;
  type: string;
  mlModelPlotAgg: {
    min: string;
    max: string;
  };
  fieldIds?: FieldId[];
  fields?: Field[];
}

export interface NewJobCaps {
  fields: Field[];
  aggs: Aggregation[];
}
