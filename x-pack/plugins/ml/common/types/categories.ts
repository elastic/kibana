/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type CategoryId = number;

export interface Category {
  job_id: string;
  category_id: CategoryId;
  terms: string;
  regex: string;
  max_matching_length: number;
  examples: string[];
  grok_pattern: string;
  partition_field_name?: string; // TODO: make non-optional once fields have been added to the results
  partition_field_value?: string; // TODO: make non-optional once fields have been added to the results
}
