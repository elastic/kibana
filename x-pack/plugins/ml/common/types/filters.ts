/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Filter {
  filter_id: string;
  description?: string;
  items: string[];
}

interface FilterUsage {
  jobs: string[];
  detectors: string[];
}

export interface FilterStats {
  filter_id: string;
  description?: string;
  item_count: number;
  used_by?: FilterUsage;
}
