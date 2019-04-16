/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../common/constants/field_types';

export interface Field {
  id: string;
  name: string;
  type: ES_FIELD_TYPES;
  aggregatable: boolean;
  aggIds?: string[];
  aggs?: Aggregation[];
}

export interface Aggregation {
  id: string;
  title: string;
  kibanaName: string;
  dslName: string;
  type: string;
  mlModelPlotAgg: {
    min: string;
    max: string;
  };
  fieldIds?: string[];
  fields?: Field[];
}
