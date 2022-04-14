/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StorageExplorerItem {
  service: string;
  environments: string[];
  size: number;
  sampling: number;
  transaction: number;
  span: number;
  error: number;
  metric: number;
}
