/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Utility type for converting a union of types into an intersection.
 *
 * This is a bit of "black magic" that will interpret a Union type as an Intersection
 * type.  This is necessary in this case of distiguishing one collection from
 * another in `FunctionError` and `FunctionStrings`.
 */
// prettier-ignore
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

/**
 * Utility type: gathers values of a collection as a type for use as a type.
 */
export type ValuesOf<T extends any[]> = T[number];

/**
 * Represents an object that is intended to be rendered.
 */
export interface Render<T> {
  type: 'render';
  as: string;
  value: T;
}

/**
 * Represents an object that is a Filter.
 */
export interface Filter {
  type?: string;
  value?: string;
  column?: string;
  and: Filter[];
  to?: string;
  from?: string;
  query?: string | null;
}

/**
 * Represents a function called by the `case` Function.
 */
export interface Case {
  matches: any;
  result: any;
}

// DATATABLES
// ----------

/**
 * A Utility function that Typescript can use to determine if an object is a Datatable.
 * @param datatable
 */
export const isDatatable = (datatable: any): datatable is Datatable =>
  !!datatable && datatable.type === 'datatable';

/**
 * This type represents the `type` of any `DatatableColumn` in a `Datatable`.
 */
export type DatatableColumnType = 'string' | 'number' | 'boolean' | 'date' | 'null';

/**
 * This type represents a `DatatableRow` in a `Datatable`.
 */
export type DatatableRow = Record<string, any>;

/**
 * This type represents the shape of a column in a `Datatable`.
 */
export interface DatatableColumn {
  name: string;
  type: DatatableColumnType;
}

/**
 * A `Datatable` in Canvas is a unique structure that represents tabulated data.
 */
export interface Datatable {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  type: 'datatable';
}

export type Legend = 'nw' | 'sw' | 'ne' | 'se';

/**
 * Allowed column names in a PointSeries
 */
export type PointSeriesColumnName = 'x' | 'y' | 'color' | 'size' | 'text';

/**
 * Column in a PointSeries
 */
export interface PointSeriesColumn {
  type: 'number' | 'string';
  role: 'measure' | 'dimension';
  expression: string;
}

/**
 * Represents a collection of valid Columns in a PointSeries
 */
export type PointSeriesColumns = { [key in PointSeriesColumnName]: PointSeriesColumn };

/**
 * A `PointSeries` in Canvas is a unique structure that represents dots on a chart.
 */
export interface PointSeries {
  columns: PointSeriesColumns;
  rows: Array<Record<string, any>>;
  type: 'pointseries';
}

export interface SeriesStyle {
  bars: number;
  color: string;
  fill: number;
  horizontalBars: boolean;
  label: string;
  lines: number;
  points: number;
  stack: number;
  type: 'seriesStyle';
}

export interface Palette {
  type: 'palette';
  colors: string[];
  gradient: boolean;
}

export interface Ticks {
  x: {
    hash: Record<string, any>;
    counter: number;
  };
  y: {
    hash: Record<string, any>;
    counter: number;
  };
}

export interface AxisConfig {
  type: 'axisConfig';
  show: boolean;
  position: 'bottom' | 'top' | 'left' | 'right';
  min: number;
  max: number;
  tickSize: number;
}

/**
 * A Utility function that Typescript can use to determine if an object is an AxisConfig.
 * @param axisConfig
 */
export const isAxisConfig = (axisConfig: any): axisConfig is AxisConfig =>
  !!axisConfig && axisConfig.type === 'axisConfig';
