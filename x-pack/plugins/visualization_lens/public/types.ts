/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EditorFrameAPI {
  render: (domElement: Element) => void;
  registerDatasource: (datasource: Datasource<unknown>) => void;
  registerVisualization: (visualization: Visualization<unknown>) => void;
}

export interface EditorFrameState {
  visualizations: { [id: string]: object };
  datasources: { [id: string]: object };

  activeDatasourceId: string;
  activeVisualizationId: string;
}

// Hints the default nesting to the data source. 0 is the highest priority
export type DimensionPriority = 0 | 1 | 2;

// For switching between visualizations and correctly matching columns
export type DimensionRole =
  | 'splitChart'
  | 'series'
  | 'primary'
  | 'secondary'
  | 'color'
  | 'size'
  | string; // Some visualizations will use custom names that have other meaning

export interface TableMetaInfo {
  columnId: string;
  operation: Operation;
}

export interface DatasourceSuggestion<T> {
  state: T;
  tableMetas: TableMetaInfo[];
}

/**
 * Interface for the datasource registry
 */
export interface Datasource<T> {
  // For initializing from saved object
  // initialize: (state?: T) => Promise<T>;

  renderDataPanel: (props: DatasourceDataPanelProps) => void;

  toExpression: (state: T) => string;

  getDatasourceSuggestionsForField: (state: T) => Array<DatasourceSuggestion<T>>;
  getDatasourceSuggestionsFromCurrentState: (state: T) => Array<DatasourceSuggestion<T>>;

  getPublicAPI: (state: T, setState: (newState: T) => void) => DatasourcePublicAPI;
  // publicAPI: {
  //   [key in keyof DatasourcePublicAPI]: (
  //     state: T,
  //     setState: (newState: T) => void
  //   ) => DatasourcePublicAPI[key]
  // };
}

/**
 * This is an API provided to visualizations by the frame, which calls the publicAPI on the datasource
 */
export interface DatasourcePublicAPI {
  getTableSpec: () => TableSpec;
  getOperationForColumnId: () => Operation;

  // Called by dimension
  getDimensionPanelComponent: (
    props: DatasourceDimensionPanelProps
  ) => (domElement: Element, operations: Operation[]) => void;

  removeColumnInTableSpec: (columnId: string) => TableSpec;
  moveColumnTo: (columnId: string, targetIndex: number) => void;
  duplicateColumn: (columnId: string) => TableSpec;
}

export interface DatasourceDataPanelProps {
  domElement: Element;
}

// The only way a visualization has to restrict the query building
export interface DatasourceDimensionPanelProps {
  // If no columnId is passed, it will render as empty
  columnId?: string;

  // Visualizations can restrict operations based on their own rules
  filterOperations: (operation: Operation) => boolean;

  // Visualizations can hint at the role this dimension would play, which
  // affects the ordering of the query
  suggestedPriority?: DimensionPriority;
}

export interface DatasourceValidationError {
  type: 'error';
}

export interface DatasourceValidationValid {
  type: 'valid';
}

export type DataType = 'string' | 'number' | 'date' | 'boolean';

// An operation does not represent a column in the datatable
export interface Operation {
  // Operation ID is a reference to the operation
  id: string;
  // User-facing label for the operation
  label: string;
  dataType: DataType;
  // A bucketed operation has many values the same
  isBucketed: boolean;

  // Extra meta-information like cardinality, color
}

export interface TableSpecColumn {
  // Column IDs are the keys for internal state in data sources and visualizations
  columnId: string;
}

// TableSpec is managed by visualizations
export type TableSpec = TableSpecColumn[];

export type VisualizationTableRequest = Array<{
  dataType: 'string' | 'number';
  isBucketed: boolean;
}>;

export interface VisualizationProps<T> {
  datasource: DatasourcePublicAPI;
  state: T;
  setState: (newState: T) => void;
}

export interface VisualizationSuggestion<T> {
  score: number;
  title: string;
  state: T;
  datasourceSuggestionId: string;
}

export interface Visualization<T> {
  // Used to switch to this visualization from another
  getInitialStateFromOtherVisualization: (
    options: {
      roles: DimensionRole[];
      datasource: DatasourcePublicAPI;
      state?: T;
    }
  ) => T[];

  renderConfigPanel: (props: VisualizationProps<T>) => void;

  toExpression: (state: T, datasource: DatasourcePublicAPI) => string;

  // For use in transitioning from one viz to another
  getMappingOfTableToRoles: (state: T, datasource: DatasourcePublicAPI) => DimensionRole[];

  // Filter suggestions from datasource to good suggestions, used for suggested visualizations
  // Can be used to switch to a better visualization given the data table
  getSuggestionsFromTableSpecs: (
    options: {
      roles: DimensionRole[];
      tableMetas: { [datasourceSuggestionId: string]: TableMetaInfo };
      state?: T; // State is only passed if the visualization is active
    }
  ) => Array<VisualizationSuggestion<T>>;
}
