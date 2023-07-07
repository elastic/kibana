/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUMMARY_OCCURRENCES_7D_ROLLING } from './summary_occurrences_7d_rolling';
import { SUMMARY_OCCURRENCES_30D_ROLLING } from './summary_occurrences_30d_rolling';
import { SUMMARY_OCCURRENCES_90D_ROLLING } from './summary_occurrences_90d_rolling';

export const ALL_TRANSFORM_TEMPLATES = [
  SUMMARY_OCCURRENCES_7D_ROLLING,
  SUMMARY_OCCURRENCES_30D_ROLLING,
  SUMMARY_OCCURRENCES_90D_ROLLING,
];
