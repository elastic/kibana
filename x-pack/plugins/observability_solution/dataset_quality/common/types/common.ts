/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SortDirection = 'asc' | 'desc';

export type Maybe<T> = T | null | undefined;

export interface Coordinate {
  x: number;
  y: Maybe<number>;
}
