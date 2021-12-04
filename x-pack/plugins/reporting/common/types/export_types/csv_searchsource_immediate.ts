/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedSearchSourceFields } from 'src/plugins/data/common';

export interface FakeRequest {
  headers: Record<string, string>;
}

export interface JobParamsDownloadCSV {
  browserTimezone: string;
  title: string;
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
}

export interface SavedObjectServiceError {
  statusCode: number;
  error?: string;
  message?: string;
}
