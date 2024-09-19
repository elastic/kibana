/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NumericDataItem {
  key: number;
  key_as_string?: string | number;
  doc_count: number;
}

export interface NumericChartData {
  data: NumericDataItem[];
  id: string;
  interval: number;
  stats: [number, number];
  type: 'numeric';
}

export const isNumericChartData = (arg: any): arg is NumericChartData => {
  return (
    typeof arg === 'object' &&
    arg.hasOwnProperty('data') &&
    arg.hasOwnProperty('id') &&
    arg.hasOwnProperty('interval') &&
    arg.hasOwnProperty('stats') &&
    arg.hasOwnProperty('type') &&
    arg.type === 'numeric'
  );
};

export interface OrdinalDataItem {
  key: string;
  key_as_string?: string;
  doc_count: number;
}

export interface OrdinalChartData {
  cardinality: number;
  data: OrdinalDataItem[];
  id: string;
  type: 'ordinal' | 'boolean';
}

export const isOrdinalChartData = (arg: any): arg is OrdinalChartData => {
  return (
    typeof arg === 'object' &&
    arg.hasOwnProperty('data') &&
    arg.hasOwnProperty('cardinality') &&
    arg.hasOwnProperty('id') &&
    arg.hasOwnProperty('type') &&
    (arg.type === 'ordinal' || arg.type === 'boolean')
  );
};

export interface UnsupportedChartData {
  id: string;
  type: 'unsupported';
}

export const isUnsupportedChartData = (arg: any): arg is UnsupportedChartData => {
  return typeof arg === 'object' && arg.hasOwnProperty('type') && arg.type === 'unsupported';
};

export type ChartDataItem = NumericDataItem | OrdinalDataItem;
export type ChartData = NumericChartData | OrdinalChartData | UnsupportedChartData;
