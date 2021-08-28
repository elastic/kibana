/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { FIELD_ORIGIN } from '../../../../common/constants';
import type { IESAggSource } from '../../sources/es_agg_source/es_agg_source';
import type { IField } from '../field';

export interface IESAggField extends IField {
  getValueAggDsl(indexPattern: IndexPattern): unknown | null;
  getBucketCount(): number;
}

export interface CountAggFieldParams {
  label?: string;
  source: IESAggSource;
  origin: FIELD_ORIGIN;
  canReadFromGeoJson?: boolean;
}
