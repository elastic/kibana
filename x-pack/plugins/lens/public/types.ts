/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EditorFrameSetup {
  render: (domElement: Element) => void;
  // generic type on the API functions to pull the "unknown vs. specific type" error into the implementation
  registerDatasource: <T>(name: string, datasource: Datasource<T>) => void;
  registerVisualization: <T>(name: string, visualization: Visualization<T>) => void;
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

export interface TableColumns {
  columnId: string;
  operation: Operation;
}

export interface DatasourceSuggestion<T = unknown> {
  state: T;
  tableColumns: TableColumns[];
}

/**
 * Interface for the datasource registry
 */
export interface Datasource<T = unknown> {
  // For initializing from saved object
  initialize: (state?: T) => Promise<T>;

  renderDataPanel: (props: DatasourceDataPanelProps) => void;

  toExpression: (state: T) => string;

  getDatasourceSuggestionsForField: (state: T) => Array<DatasourceSuggestion<T>>;
  getDatasourceSuggestionsFromCurrentState: (state: T) => Array<DatasourceSuggestion<T>>;

  getPublicAPI: (state: T, setState: (newState: T) => void) => DatasourcePublicAPI;
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
  // affects the default ordering of the query
  suggestedPriority?: DimensionPriority;
}

export type DataType = 'string' | 'number' | 'date' | 'boolean';

// An operation represents a column in a table, not any information
// about how the column was created such as whether it is a sum or average.
// Visualizations are able to filter based on the output, not based on the
// underlying data
export interface Operation {
  // Operation ID is a reference to the operation
  id: string;
  // User-facing label for the operation
  label: string;
  // The output of this operation will have this data type
  dataType: DataType;
  // A bucketed operation is grouped by duplicate values, otherwise each row is
  // treated as unique
  isBucketed: boolean;

  // Extra meta-information like cardinality, color
}

export interface TableSpecColumn {
  // Column IDs are the keys for internal state in data sources and visualizations
  columnId: string;
}

// TableSpec is managed by visualizations
export type TableSpec = TableSpecColumn[];

export interface VisualizationProps<T = unknown> {
  datasource: DatasourcePublicAPI;
  state: T;
  setState: (newState: T) => void;
}

export interface GetSuggestions<T = unknown> {
  // Roles currently being used
  roles: DimensionRole[];
  // It is up to the Visualization to rank these tables
  tableColumns: { [datasourceSuggestionId: string]: TableColumns };
  state?: T; // State is only passed if the visualization is active
}

export interface VisualizationSuggestion<T = unknown> {
  score: number;
  title: string;
  state: T;
  datasourceSuggestionId: string;
}

export interface Visualization<T = unknown> {
  renderConfigPanel: (props: VisualizationProps<T>) => void;

  toExpression: (state: T, datasource: DatasourcePublicAPI) => string;

  // Frame will request the list of roles currently being used when calling `getInitialStateFromOtherVisualization`
  getMappingOfTableToRoles: (state: T, datasource: DatasourcePublicAPI) => DimensionRole[];

  // Used to switch to this visualization from another
  getInitialStateFromOtherVisualization: (options: GetSuggestions<T>) => T[];

  // Filter suggestions from datasource to good suggestions, used for suggested visualizations
  // Can be used to switch to a better visualization given the data table
  getSuggestionsFromTableSpecs: (options: GetSuggestions<T>) => Array<VisualizationSuggestion<T>>;
}
