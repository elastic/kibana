/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface PageInfo {
  index: number;
  size: number;
}

export interface ItemsPage<T> {
  items: T[];
  pageInfo: PageInfo;
  totalItemsCount: number;
}

export const pageInfosEqual = (pageInfo1: PageInfo, pageInfo2: PageInfo) =>
  pageInfo1.index === pageInfo2.index && pageInfo1.size === pageInfo2.size;
