/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ChartDisplayOptions {
  breakdownField: string | null;
}

export type PartialChartDisplayOptions = Partial<ChartDisplayOptions>;

export interface DocumentFieldGridColumnOptions {
  type: 'document-field';
  field: string;
  width?: number;
}

export interface SmartFieldGridColumnOptions {
  type: 'smart-field';
  smartField: 'content' | 'resource';
  fallbackFields: string[];
  width?: number;
}

export type GridColumnDisplayOptions = DocumentFieldGridColumnOptions | SmartFieldGridColumnOptions;

export interface GridRowsDisplayOptions {
  rowHeight: number;
  rowsPerPage: number;
}

export type PartialGridRowsDisplayOptions = Partial<GridRowsDisplayOptions>;

export interface GridDisplayOptions {
  columns: GridColumnDisplayOptions[];
  rows: GridRowsDisplayOptions;
}

export type PartialGridDisplayOptions = Partial<
  Omit<GridDisplayOptions, 'rows'> & { rows?: PartialGridRowsDisplayOptions }
>;

export interface DisplayOptions {
  grid: GridDisplayOptions;
  chart: ChartDisplayOptions;
}

export interface PartialDisplayOptions {
  grid?: PartialGridDisplayOptions;
  chart?: PartialChartDisplayOptions;
}
