/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SimpleSavedObject } from '../../../../../src/core/public/saved_objects/simple_saved_object';

export type {
  DocumentCountBuckets,
  DocumentCounts,
  FieldRequestConfig,
  FieldVisStats,
  Percentile,
} from './field_request_config';
export type { JobFieldType } from './job_field_type';
export type InputData = any[];

export interface DataVisualizerTableState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  visibleFieldTypes: string[];
  visibleFieldNames: string[];
  showDistributions: boolean;
}

export type SavedSearchSavedObject = SimpleSavedObject<any>;
