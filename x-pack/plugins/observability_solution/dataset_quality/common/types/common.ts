/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamStatType } from '../data_streams_stats';
import { Integration } from '../data_streams_stats/integration';

export type SortDirection = 'asc' | 'desc';

export type Maybe<T> = T | null | undefined;

export interface Coordinate {
  x: number;
  y: Maybe<number>;
}

export interface BasicDataStream {
  type: string;
  name: DataStreamStatType['name'];
  rawName: string;
  namespace: string;
  title: string;
  integration?: Integration;
}
