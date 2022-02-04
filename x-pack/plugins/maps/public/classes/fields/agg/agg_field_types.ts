/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IField } from '../field';
import { DataView } from '../../../../../../../src/plugins/data/common';
import { IESAggSource } from '../../sources/es_agg_source';
import { FIELD_ORIGIN } from '../../../../common/constants';

export interface IESAggField extends IField {
  getValueAggDsl(indexPattern: DataView): unknown | null;
  getBucketCount(): number;
}

export interface CountAggFieldParams {
  label?: string;
  source: IESAggSource;
  origin: FIELD_ORIGIN;
}
