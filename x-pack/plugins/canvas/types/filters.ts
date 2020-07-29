/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum FilterType {
  luceneQueryString = 'luceneQueryString',
  time = 'time',
  exactly = 'exactly',
}

interface CanvasFilterBase {
  type: FilterType;
  column: string;
  and: string[];
  filterType: string;
}

export type CanvasTimeFilter = CanvasFilterBase & {
  filterType: typeof FilterType.time;
  to: string;
  from: string;
};

export type CanvasLuceneFilter = CanvasFilterBase & {
  filterType: typeof FilterType.luceneQueryString;
  query: string;
};

export type CanvasExactlyFilter = CanvasFilterBase & {
  filterType: typeof FilterType.exactly;
  value: string;
};

export type CanvasFilter = CanvasTimeFilter | CanvasExactlyFilter | CanvasLuceneFilter;
