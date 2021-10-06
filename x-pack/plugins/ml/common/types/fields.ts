/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ES_FIELD_TYPES } from '../../../../../src/plugins/data/common';
import {
  ML_JOB_AGGREGATION,
  KIBANA_AGGREGATION,
  ES_AGGREGATION,
} from '../constants/aggregation_types';
import { MLCATEGORY } from '../constants/field_types';

export const EVENT_RATE_FIELD_ID = '__ml_event_rate_count__';
export const METRIC_AGG_TYPE = 'metrics';

export type FieldId = string;
export type AggId = ML_JOB_AGGREGATION;
export type SplitField = Field | null;

export interface Field {
  id: FieldId;
  name: string;
  type: ES_FIELD_TYPES;
  aggregatable?: boolean;
  aggIds?: AggId[];
  aggs?: Aggregation[];
  runtimeField?: estypes.MappingRuntimeField;
}

export interface Aggregation {
  id: AggId;
  title: string;
  kibanaName: KIBANA_AGGREGATION | null;
  dslName: ES_AGGREGATION | null;
  type: typeof METRIC_AGG_TYPE;
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

export interface NewJobCapsResponse {
  [indexPattern: string]: NewJobCaps;
}

export interface AggFieldPair {
  agg: Aggregation;
  field: Field;
  by?: {
    field: SplitField;
    value: string | null;
  };
  over?: {
    field: SplitField;
    value: string | null;
  };
  partition?: {
    field: SplitField;
    value: string | null;
  };
  excludeFrequent?: string;
}

export interface AggFieldNamePair {
  agg: string;
  field: string;
  by?: {
    field: string | null;
    value: string | null;
  };
  over?: {
    field: string | null;
    value: string | null;
  };
  partition?: {
    field: string | null;
    value: string | null;
  };
  excludeFrequent?: string;
}

export const mlCategory: Field = {
  id: MLCATEGORY,
  name: MLCATEGORY,
  type: ES_FIELD_TYPES.KEYWORD,
  aggregatable: false,
};

export interface FieldAggCardinality {
  field: string;
  percent?: any;
}

export interface ScriptAggCardinality {
  script: any;
}

export interface AggCardinality {
  cardinality: FieldAggCardinality | ScriptAggCardinality;
}

export type RollupFields = Record<FieldId, [Record<'agg', ES_AGGREGATION>]>;

export type RuntimeMappings = estypes.MappingRuntimeFields;
