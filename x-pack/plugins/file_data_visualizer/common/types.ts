/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JOB_FIELD_TYPES } from './constants';

export type InputData = any[];

export type JobFieldType = typeof JOB_FIELD_TYPES[keyof typeof JOB_FIELD_TYPES];

export interface DataVisualizerTableState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  visibleFieldTypes: string[];
  visibleFieldNames: string[];
  showDistributions: boolean;
}
