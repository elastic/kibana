/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldValuePair } from '../types';
import { FieldStats } from '../field_stats_types';

export interface ChangePoint extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
}

export interface WindowParameters {
  baselineMin: number;
  baselineMax: number;
  deviationMin: number;
  deviationMax: number;
}

export type ChangePointParams = Partial<WindowParameters>;

export interface ChangePointsResponse {
  ccsWarning: boolean;
  changePoints?: ChangePoint[];
  fieldStats?: FieldStats[];
}
