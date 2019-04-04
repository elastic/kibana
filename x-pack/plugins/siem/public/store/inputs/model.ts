/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface AbsoluteTimeRange {
  kind: 'absolute';
  from: number;
  to: number;
}

interface RelativeTimeRange {
  kind: 'relative';
  option: 'week-to-date' | 'month-to-date' | 'year-to-date' | 'quick-select';
  from: number;
  to: number;
}

export type TimeRange = AbsoluteTimeRange | RelativeTimeRange;

export interface Policy {
  kind: 'manual' | 'interval';
  duration: number; // in ms
}

export type Refetch = () => void;
export interface GlobalQuery {
  id: string;
  loading: boolean;
  refetch: null | Refetch;
}

export interface InputsRange {
  timerange: TimeRange;
  policy: Policy;
  query: GlobalQuery[];
}

export interface InputsModel {
  global: InputsRange;
}
