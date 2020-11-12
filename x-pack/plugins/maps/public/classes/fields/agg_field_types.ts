/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IField } from './field';
import { IndexPattern } from '../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { IESAggSource } from '../sources/es_agg_source';
import { FIELD_ORIGIN } from '../../../common/constants';

export interface IESAggField extends IField {
  getValueAggDsl(indexPattern: IndexPattern): unknown | null;
  getBucketCount(): number;
}

export interface IESAggFieldParams {
  label?: string;
  source: IESAggSource;
  origin: FIELD_ORIGIN;
  canReadFromGeoJson?: boolean;
}
