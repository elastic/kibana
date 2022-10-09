/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Paginate<T> {
  data: T[];
  has_more_hits_than_total: boolean;
  pageIndex: number;
  pageSize: number;
  size: number;
  total: number;
}
