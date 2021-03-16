/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CalloutMessage {
  id: string;
  heading: string;
  status: VALIDATION_STATUS;
  text: string;
  url?: string;
}

export type ValidateAnalyticsJobResponse = CalloutMessage[];

export enum VALIDATION_STATUS {
  ERROR = 'error',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
}

export const SKIP_BUCKET_SPAN_ESTIMATION = true;

export const ALLOWED_DATA_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export const JOB_ID_MAX_LENGTH = 64;

// Data Frame Analytics
export const TRAINING_DOCS_UPPER = 200000;
export const TRAINING_DOCS_LOWER = 200;
export const INCLUDED_FIELDS_THRESHOLD = 100;
export const MINIMUM_NUM_FIELD_FOR_CHECK = 25;
export const FRACTION_EMPTY_LIMIT = 0.3;
export const NUM_CATEGORIES_THRESHOLD = 10;
export const ALL_CATEGORIES = -1;
