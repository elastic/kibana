/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Ast } from '@kbn/interpreter';
import type { IconType } from '@elastic/eui/src/components/icon/icon';
import type { CoreStart, SavedObjectReference, ResolvedSimpleSavedObject } from '@kbn/core/public';
import type { PaletteOutput } from '@kbn/coloring';
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import type { MutableRefObject } from 'react';
import type { Filter, TimeRange } from '@kbn/es-query';
import type {
  ExpressionAstExpression,
  IInterpreterRenderHandlers,
  Datatable,
  ExpressionRendererEvent,
} from '@kbn/expressions-plugin/public';
import type { Configuration, NavigateToLensContext } from '@kbn/visualizations-plugin/common';
import type { Query } from '@kbn/es-query';
import type {
  UiActionsStart,
  RowClickContext,
  VisualizeFieldContext,
} from '@kbn/ui-actions-plugin/public';
import type {
  ClickTriggerEvent,
  BrushTriggerEvent,
  MultiClickTriggerEvent,
} from '@kbn/charts-plugin/public';
import type { IndexPatternAggRestrictions } from '@kbn/data-plugin/public';
import type { FieldSpec, DataViewSpec, DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { SearchResponseWarning } from '@kbn/data-plugin/public/search/types';
import type { EuiButtonIconProps } from '@elastic/eui';
import { SearchRequest } from '@kbn/data-plugin/public';
import { estypes } from '@elastic/elasticsearch';
import React from 'react';
import { CellValueContext } from '@kbn/embeddable-plugin/public';
import type { DraggingIdentifier, DragDropIdentifier, DragContextState } from './drag_drop';
import type { DateRange, LayerType, SortingHint } from '../common';
import type {
  LensSortActionData,
  LensResizeActionData,
  LensToggleActionData,
  LensPagesizeActionData,
} from './visualizations/datatable/components/types';

import {
  LENS_EDIT_SORT_ACTION,
  LENS_EDIT_RESIZE_ACTION,
  LENS_TOGGLE_ACTION,
  LENS_EDIT_PAGESIZE_ACTION,
} from './visualizations/datatable/components/constants';
import type { LensInspector } from './lens_inspector_service';
import type { FormatSelectorOptions } from './datasources/form_based/dimension_panel/format_selector';
import type { DataViewsState } from './state_management/types';
import type { IndexPatternServiceAPI } from './data_views_service/service';
import type { Document } from './persistence/saved_object_store';

export interface IndexPatternRef {
  id: string;
  title: string;
  name?: string;
}

export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  getFieldByName(name: string): IndexPatternField | undefined;
  title: string;
  name?: string;
  timeFieldName?: string;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: FieldFormatParams;
    }
  >;
  hasRestrictions: boolean;
  spec: DataViewSpec;
  isPersisted: boolean;
}

export type IndexPatternField = FieldSpec & {
  displayName: string;
  aggregationRestrictions?: Partial<IndexPatternAggRestrictions>;
  /**
   * Map of fields which can be used, but may fail partially (ranked lower than others)
   */
  partiallyApplicableFunctions?: Partial<Record<string, boolean>>;
  timeSeriesMetric?: 'histogram' | 'summary' | 'gauge' | 'counter';
  timeSeriesRollup?: boolean;
  meta?: boolean;
  runtime?: boolean;
};

export interface PublicAPIProps<T> {
  state: T;
  layerId: string;
  indexPatterns: IndexPatternMap;
}

export interface EditorFrameProps {
  showNoDataPopover: () => void;
  lensInspector: LensInspector;
  indexPatternService: IndexPatternServiceAPI;
  getUserMessages: UserMessagesGetter;
  addUserMessages: AddUserMessages;
}

export type VisualizationMap = Record<string, Visualization>;
export type DatasourceMap = Record<string, Datasource>;
export type IndexPatternMap = Record<string, IndexPattern>;

export interface EditorFrameInstance {
  EditorFrameContainer: (props: EditorFrameProps) => React.ReactElement;
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
}

export interface EditorFrameSetup {
  // generic type on the API functions to pull the "unknown vs. specific type" error into the implementation
  registerDatasource: <T, P>(
    datasource: Datasource<T, P> | (() => Promise<Datasource<T, P>>)
  ) => void;
  registerVisualization: <T, P>(
    visualization: Visualization<T, P> | (() => Promise<Visualization<T, P>>)
  ) => void;
}

export interface EditorFrameStart {
  createInstance: () => Promise<EditorFrameInstance>;
}

export interface TableSuggestionColumn {
  columnId: string;
  operation: Operation;
}

export interface DataSourceInfo {
  layerId: string;
  dataView?: DataView;
  columns: Array<{
    id: string;
    role: 'split' | 'metric';
    operation: OperationDescriptor & { type: string; fields?: string[]; filter?: Query };
  }>;
}

export interface VisualizationInfo {
  layers: Array<{
    layerId: string;
    layerType: string;
    chartType?: string;
    icon?: IconType;
    label?: string;
    dimensions: Array<{ name: string; id: string; dimensionType: string }>;
  }>;
}

/**
 * A possible table a datasource can create. This object is passed to the visualization
 * which tries to build a meaningful visualization given the shape of the table. If this
 * is possible, the visualization returns a `VisualizationSuggestion` object
 */
export interface TableSuggestion {
  /**
   * Flag indicating whether the table will include more than one column.
   * This is not the case for example for a single metric aggregation
   * */
  isMultiRow: boolean;
  /**
   * The columns of the table. Each column has to be mapped to a dimension in a chart. If a visualization
   * can't use all columns of a suggestion, it should not return a `VisualizationSuggestion` based on it
   * because there would be unreferenced columns
   */
  columns: TableSuggestionColumn[];
  /**
   * The layer this table will replace. This is only relevant if the visualization this suggestion is passed
   * is currently active and has multiple layers configured. If this suggestion is applied, the table of this
   * layer will be replaced by the columns specified in this suggestion
   */
  layerId: string;
  /**
   * A label describing the table. This can be used to provide a title for the `VisualizationSuggestion`,
   * but the visualization can also decide to overwrite it.
   */
  label?: string;
  /**
   * The change type indicates what was changed in this table compared to the currently active table of this layer.
   */
  changeType: TableChangeType;
}

/**
 * Indicates what was changed in this table compared to the currently active table of this layer.
 * * `initial` means the layer associated with this table does not exist in the current configuration
 * * `unchanged` means the table is the same in the currently active configuration
 * * `reduced` means the table is a reduced version of the currently active table (some columns dropped, but not all of them)
 * * `extended` means the table is an extended version of the currently active table (added one or multiple additional columns)
 * * `reorder` means the table columns have changed order, which change the data as well
 * * `layers` means the change is a change to the layer structure, not to the table
 */
export type TableChangeType =
  | 'initial'
  | 'unchanged'
  | 'reduced'
  | 'extended'
  | 'reorder'
  | 'layers';

export type DropType =
  | 'field_add'
  | 'field_replace'
  | 'reorder'
  | 'move_compatible'
  | 'replace_compatible'
  | 'move_incompatible'
  | 'replace_incompatible'
  | 'replace_duplicate_compatible'
  | 'duplicate_compatible'
  | 'swap_compatible'
  | 'replace_duplicate_incompatible'
  | 'duplicate_incompatible'
  | 'swap_incompatible'
  | 'field_combine'
  | 'combine_compatible'
  | 'combine_incompatible';

export interface DatasourceSuggestion<T = unknown> {
  state: T;
  table: TableSuggestion;
  keptLayerIds: string[];
}

type StateSetterArg<T> = T | ((prevState: T) => T);

export type StateSetter<T, OptionsShape = unknown> = (
  newState: StateSetterArg<T>,
  options?: OptionsShape
) => void;

export interface InitializationOptions {
  isFullEditor?: boolean;
}

export type VisualizeEditorContext<T extends Configuration = Configuration> = {
  savedObjectId?: string;
  embeddableId?: string;
  vizEditorOriginatingAppUrl?: string;
  originatingApp?: string;
  isVisualizeAction: boolean;
  searchQuery?: Query;
  searchFilters?: Filter[];
  title?: string;
  visTypeTitle?: string;
  isEmbeddable?: boolean;
} & NavigateToLensContext<T>;

export interface GetDropPropsArgs<T = unknown> {
  state: T;
  source?: DraggingIdentifier;
  target: DragDropOperation;
  indexPatterns: IndexPatternMap;
}

interface DimensionLink {
  from: { columnId: string; groupId: string; layerId: string };
  to: {
    columnId?: string;
    groupId: string;
    layerId: string;
  };
}

type UserMessageDisplayLocation =
  | {
      // NOTE: We want to move toward more errors that do not block the render!
      id:
        | 'toolbar'
        | 'embeddableBadge'
        | 'visualization' // blocks render
        | 'visualizationOnEmbeddable' // blocks render in embeddable only
        | 'visualizationInEditor' // blocks render in editor only
        | 'textBasedLanguagesQueryInput'
        | 'banner';
    }
  | { id: 'dimensionTrigger'; dimensionId: string };

export type UserMessagesDisplayLocationId = UserMessageDisplayLocation['id'];

export interface UserMessage {
  uniqueId?: string;
  severity: 'error' | 'warning';
  shortMessage: string;
  longMessage: React.ReactNode | string;
  fixableInEditor: boolean;
  displayLocations: UserMessageDisplayLocation[];
}

export type RemovableUserMessage = UserMessage & { uniqueId: string };

export interface UserMessageFilters {
  severity?: UserMessage['severity'];
  dimensionId?: string;
}

export type UserMessagesGetter = (
  locationId: UserMessagesDisplayLocationId | UserMessagesDisplayLocationId[] | undefined,
  filters: UserMessageFilters
) => UserMessage[];

export type AddUserMessages = (messages: RemovableUserMessage[]) => () => void;

export function isMessageRemovable(message: UserMessage): message is RemovableUserMessage {
  return Boolean(message.uniqueId);
}

/**
 * Interface for the datasource registry
 */
export interface Datasource<T = unknown, P = unknown> {
  id: string;

  // For initializing, either from an empty state or from persisted state
  // Because this will be called at runtime, state might have a type of `any` and
  // datasources should validate their arguments
  initialize: (
    state?: P,
    savedObjectReferences?: SavedObjectReference[],
    initialContext?: VisualizeFieldContext | VisualizeEditorContext,
    indexPatternRefs?: IndexPatternRef[],
    indexPatterns?: IndexPatternMap
  ) => T;

  // Given the current state, which parts should be saved?
  getPersistableState: (state: T) => { state: P; savedObjectReferences: SavedObjectReference[] };

  insertLayer: (state: T, newLayerId: string, linkToLayers?: string[]) => T;
  createEmptyLayer: (indexPatternId: string) => T;
  removeLayer: (state: T, layerId: string) => { newState: T; removedLayerIds: string[] };
  clearLayer: (state: T, layerId: string) => { newState: T; removedLayerIds: string[] };
  cloneLayer: (
    state: T,
    layerId: string,
    newLayerId: string,
    getNewId: (id: string) => string
  ) => T;
  getLayers: (state: T) => string[];
  removeColumn: (props: {
    prevState: T;
    layerId: string;
    columnId: string;
    indexPatterns: IndexPatternMap;
  }) => T;
  initializeDimension?: (
    state: T,
    layerId: string,
    indexPatterns: IndexPatternMap,
    value: {
      columnId: string;
      groupId: string;
      visualizationGroups: VisualizationDimensionGroupConfig[];
      staticValue?: unknown;
      autoTimeField?: boolean;
    }
  ) => T;

  syncColumns: (args: {
    state: T;
    links: Array<DimensionLink & { to: { columnId: string } }>;
    getDimensionGroups: (layerId: string) => VisualizationDimensionGroupConfig[];
    indexPatterns: IndexPatternMap;
  }) => T;
  getSelectedFields?: (state: T) => string[];

  renderLayerSettings?: (
    domElement: Element,
    props: DatasourceLayerSettingsProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  renderDataPanel: (
    domElement: Element,
    props: DatasourceDataPanelProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  renderDimensionTrigger: (
    domElement: Element,
    props: DatasourceDimensionTriggerProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  renderDimensionEditor: (
    domElement: Element,
    props: DatasourceDimensionEditorProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  renderLayerPanel: (
    domElement: Element,
    props: DatasourceLayerPanelProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  getDropProps: (
    props: GetDropPropsArgs<T>
  ) => { dropTypes: DropType[]; nextLabel?: string } | undefined;
  onDrop: (props: DatasourceDimensionDropHandlerProps<T>) => boolean | undefined;
  /**
   * The datasource is allowed to cancel a close event on the dimension editor,
   * mainly used for formulas
   */
  canCloseDimensionEditor?: (state: T) => boolean;
  getCustomWorkspaceRenderer?: (
    state: T,
    dragging: DraggingIdentifier,
    indexPatterns: Record<string, IndexPattern>
  ) => undefined | (() => JSX.Element);
  updateStateOnCloseDimension?: (props: {
    layerId: string;
    columnId: string;
    state: T;
  }) => T | undefined;

  updateCurrentIndexPatternId?: (props: {
    indexPatternId: string;
    state: T;
    setState: StateSetter<T>;
  }) => void;
  onIndexPatternChange?: (
    state: T,
    indexPatterns: IndexPatternMap,
    indexPatternId: string,
    layerId?: string
  ) => T;
  onIndexPatternRename?: (state: T, oldIndexPatternId: string, newIndexPatternId: string) => T;
  triggerOnIndexPatternChange?: (
    state: T,
    oldIndexPatternId: string,
    newIndexPatternId: string
  ) => void;

  onRefreshIndexPattern: () => void;

  toExpression: (
    state: T,
    layerId: string,
    indexPatterns: IndexPatternMap,
    dateRange: DateRange,
    searchSessionId?: string
  ) => ExpressionAstExpression | string | null;

  getDatasourceSuggestionsForField: (
    state: T,
    field: unknown,
    filterFn: (layerId: string) => boolean,
    indexPatterns: IndexPatternMap
  ) => Array<DatasourceSuggestion<T>>;
  getDatasourceSuggestionsForVisualizeCharts: (
    state: T,
    context: NavigateToLensContext['layers'],
    indexPatterns: IndexPatternMap
  ) => Array<DatasourceSuggestion<T>>;
  getDatasourceSuggestionsForVisualizeField: (
    state: T,
    indexPatternId: string,
    fieldName: string,
    indexPatterns: IndexPatternMap
  ) => Array<DatasourceSuggestion<T>>;
  getDatasourceSuggestionsFromCurrentState: (
    state: T,
    indexPatterns: IndexPatternMap,
    filterFn?: (layerId: string) => boolean,
    activeData?: Record<string, Datatable>
  ) => Array<DatasourceSuggestion<T>>;

  getPublicAPI: (props: PublicAPIProps<T>) => DatasourcePublicAPI;
  /**
   * uniqueLabels of dimensions exposed for aria-labels of dragged dimensions
   */
  uniqueLabels: (state: T) => Record<string, string>;
  /**
   * Check the internal state integrity and returns a list of missing references
   */
  checkIntegrity: (state: T, indexPatterns: IndexPatternMap) => string[];

  /**
   * The frame calls this function to display messages to the user
   */
  getUserMessages: (
    state: T,
    deps: {
      frame: FrameDatasourceAPI;
      setState: StateSetter<T>;
    }
  ) => UserMessage[];

  /**
   * The embeddable calls this function to display warnings about visualization on the dashboard
   */
  getSearchWarningMessages?: (
    state: P,
    warning: SearchResponseWarning,
    request: SearchRequest,
    response: estypes.SearchResponse
  ) => UserMessage[];

  /**
   * Checks if the visualization created is time based, for example date histogram
   */
  isTimeBased: (state: T, indexPatterns: IndexPatternMap) => boolean;
  /**
   * Given the current state layer and a columnId will verify if the column configuration has errors
   */
  isValidColumn: (
    state: T,
    indexPatterns: IndexPatternMap,
    layerId: string,
    columnId: string,
    dateRange?: DateRange
  ) => boolean;
  /**
   * Are these datasources equivalent?
   */
  isEqual: (
    persistableState1: P,
    references1: SavedObjectReference[],
    persistableState2: P,
    references2: SavedObjectReference[]
  ) => boolean;
  /**
   * Get RenderEventCounters events for telemetry
   */
  getRenderEventCounters?: (state: T) => string[];
  /**
   * Get the used DataView value from state
   */
  getUsedDataView: (state: T, layerId?: string) => string;
  /**
   * Get all the used DataViews from state
   */
  getUsedDataViews: (state: T) => string[];

  getDatasourceInfo: (
    state: T,
    references?: SavedObjectReference[],
    dataViewsService?: DataViewsPublicPluginStart
  ) => Promise<DataSourceInfo[]>;
}

export interface DatasourceFixAction<T> {
  label: string;
  newState: (frame: FrameDatasourceAPI) => Promise<T>;
}

/**
 * This is an API provided to visualizations by the frame, which calls the publicAPI on the datasource
 */
export interface DatasourcePublicAPI {
  datasourceId: string;
  getTableSpec: () => Array<{ columnId: string; fields: string[] }>;
  getOperationForColumnId: (columnId: string) => OperationDescriptor | null;
  /**
   * Collect all default visual values given the current state
   */
  getVisualDefaults: () => Record<string, Record<string, unknown>>;
  /**
   * Retrieve the specific source id for the current state
   */
  getSourceId: () => string | undefined;
  /**
   * Returns true if this is a text based language datasource
   */
  isTextBasedLanguage: () => boolean;
  /**
   * Collect all defined filters from all the operations in the layer. If it returns undefined, this means that filters can't be constructed for the current layer
   */
  getFilters: (
    activeData?: FramePublicAPI['activeData'],
    timeRange?: TimeRange
  ) =>
    | { error: string }
    | Record<
        'enabled' | 'disabled',
        {
          kuery: Query[][];
          lucene: Query[][];
        }
      >;

  /**
   * Returns the maximum possible number of values for this column when it can be known, otherwise null
   * (e.g. with a top 5 values operation, we can be sure that there will never be more than 5 values returned
   *       or 6 if the "Other" bucket is enabled)
   */
  getMaxPossibleNumValues: (columnId: string) => number | null;
  hasDefaultTimeField: () => boolean;
}

export interface DatasourceLayerSettingsProps<T = unknown> {
  layerId: string;
  state: T;
  setState: StateSetter<T>;
}

export interface DatasourceDataPanelProps<T = unknown> {
  state: T;
  dragDropContext: DragContextState;
  setState: StateSetter<T, { applyImmediately?: boolean }>;
  showNoDataPopover: () => void;
  core: Pick<
    CoreStart,
    'http' | 'notifications' | 'uiSettings' | 'overlays' | 'theme' | 'application' | 'docLinks'
  >;
  query: Query;
  dateRange: DateRange;
  filters: Filter[];
  dropOntoWorkspace: (field: DragDropIdentifier) => void;
  hasSuggestionForField: (field: DragDropIdentifier) => boolean;
  onChangeIndexPattern: (indexPatternId: string, datasourceId: string, layerId?: string) => void;
  uiActions: UiActionsStart;
  indexPatternService: IndexPatternServiceAPI;
  frame: FramePublicAPI;
  usedIndexPatterns?: string[];
}

/** @internal **/
export interface LayerAction {
  id: string;
  displayName: string;
  description?: string;
  execute: () => void | Promise<void>;
  icon: IconType;
  color?: EuiButtonIconProps['color'];
  isCompatible: boolean;
  'data-test-subj'?: string;
}

export type LayerActionFromVisualization = Omit<LayerAction, 'execute'>;

interface SharedDimensionProps {
  /** Visualizations can restrict operations based on their own rules.
   * For example, limiting to only bucketed or only numeric operations.
   */
  filterOperations: (operation: OperationMetadata) => boolean;

  /** Some dimension editors will allow users to change the operation grouping
   * from the panel, and this lets the visualization hint that it doesn't want
   * users to have that level of control
   */
  hideGrouping?: boolean;
}

export type DatasourceDimensionProps<T> = SharedDimensionProps & {
  layerId: string;
  columnId: string;
  groupId: string;
  onRemove?: (accessor: string) => void;
  state: T;
  activeData?: Record<string, Datatable>;
  dateRange: DateRange;
  indexPatterns: IndexPatternMap;
  hideTooltip?: boolean;
  invalid?: boolean;
  invalidMessage?: string | React.ReactNode;
};
export type ParamEditorCustomProps = Record<string, unknown> & {
  labels?: string[];
  isInline?: boolean;
  headingLabel?: string;
};
// The only way a visualization has to restrict the query building
export type DatasourceDimensionEditorProps<T = unknown> = DatasourceDimensionProps<T> & {
  // Not a StateSetter because we have this unique use case of determining valid columns
  setState: StateSetter<
    T,
    {
      isDimensionComplete?: boolean;
      forceRender?: boolean;
    }
  >;
  core: Pick<CoreStart, 'http' | 'notifications' | 'uiSettings' | 'overlays' | 'theme'>;
  dateRange: DateRange;
  dimensionGroups: VisualizationDimensionGroupConfig[];
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  isMetricDimension?: boolean;
  layerType: LayerType | undefined;
  supportStaticValue: boolean;
  paramEditorCustomProps?: ParamEditorCustomProps;
  enableFormatSelector: boolean;
  dataSectionExtra?: React.ReactNode;
  formatSelectorOptions: FormatSelectorOptions | undefined;
};

export type DatasourceDimensionTriggerProps<T> = DatasourceDimensionProps<T>;

export interface DatasourceLayerPanelProps<T> {
  layerId: string;
  state: T;
  activeData?: Record<string, Datatable>;
  dataViews: DataViewsState;
  onChangeIndexPattern: (indexPatternId: string, datasourceId: string, layerId?: string) => void;
}

export interface DragDropOperation {
  layerId: string;
  groupId: string;
  columnId: string;
  filterOperations: (operation: OperationMetadata) => boolean;
  indexPatternId?: string;
  isNewColumn?: boolean;
  isMetricDimension?: boolean;
  prioritizedOperation?: string;
}

export type DraggedField = DragDropIdentifier & {
  field: IndexPatternField;
  indexPatternId: string;
};

export function isOperation(operationCandidate: unknown): operationCandidate is DragDropOperation {
  return (
    typeof operationCandidate === 'object' &&
    operationCandidate !== null &&
    'columnId' in operationCandidate
  );
}

export interface DatasourceDimensionDropProps<T> {
  target: DragDropOperation;
  state: T;
  setState: StateSetter<
    T,
    {
      isDimensionComplete?: boolean;
      forceRender?: boolean;
    }
  >;
  targetLayerDimensionGroups: VisualizationDimensionGroupConfig[];
}

export type DatasourceDimensionDropHandlerProps<S> = DatasourceDimensionDropProps<S> & {
  source: DragDropIdentifier;
  dropType: DropType;
  indexPatterns: IndexPatternMap;
};

export type FieldOnlyDataType =
  | 'document'
  | 'ip'
  | 'histogram'
  | 'geo_point'
  | 'geo_shape'
  | 'counter'
  | 'gauge'
  | 'murmur3';
export type DataType = 'string' | 'number' | 'date' | 'boolean' | FieldOnlyDataType;

// An operation represents a column in a table, not any information
// about how the column was created such as whether it is a sum or average.
// Visualizations are able to filter based on the output, not based on the
// underlying data
export interface Operation extends OperationMetadata {
  // User-facing label for the operation
  label: string;
  sortingHint?: SortingHint;
}

export interface OperationMetadata {
  interval?: string;
  // The output of this operation will have this data type
  dataType: DataType;
  // A bucketed operation is grouped by duplicate values, otherwise each row is
  // treated as unique
  isBucketed: boolean;
  /**
   * ordinal: Each name is a unique value, but the names are in sorted order, like "Top values"
   * interval: Histogram data, like date or number histograms
   * ratio: Most number data is rendered as a ratio that includes 0
   */
  scale?: 'ordinal' | 'interval' | 'ratio';
  // Extra meta-information like cardinality, color
  // TODO currently it's not possible to differentiate between a field from a raw
  // document and an aggregated metric which might be handy in some cases. Once we
  // introduce a raw document datasource, this should be considered here.
  isStaticValue?: boolean;
}

/**
 * Specific type used to store some meta information on top of the Operation type
 * Rather than populate the Operation type with optional types, it can leverage a super type
 */
export interface OperationDescriptor extends Operation {
  hasTimeShift: boolean;
  hasReducedTimeRange: boolean;
}

export interface VisualizationConfigProps<T = unknown> {
  layerId: string;
  frame: FramePublicAPI;
  state: T;
}

export type VisualizationLayerWidgetProps<T = unknown> = VisualizationConfigProps<T> & {
  setState: (newState: T) => void;
  onChangeIndexPattern: (indexPatternId: string) => void;
};

export type VisualizationLayerHeaderContentProps<T = unknown> = VisualizationLayerWidgetProps<T>;

export interface VisualizationToolbarProps<T = unknown> {
  setState: (newState: T) => void;
  frame: FramePublicAPI;
  state: T;
}

export type VisualizationLayerSettingsProps<T = unknown> = VisualizationConfigProps<T> & {
  setState(newState: T | ((currState: T) => T)): void;
  panelRef: MutableRefObject<HTMLDivElement | null>;
};

export type VisualizationDimensionEditorProps<T = unknown> = VisualizationConfigProps<T> & {
  groupId: string;
  accessor: string;
  datasource: DatasourcePublicAPI | undefined;
  setState(newState: T | ((currState: T) => T)): void;
  addLayer: (layerType: LayerType) => void;
  removeLayer: (layerId: string) => void;
  panelRef: MutableRefObject<HTMLDivElement | null>;
};

export interface AccessorConfig {
  columnId: string;
  triggerIconType?:
    | 'color'
    | 'disabled'
    | 'colorBy'
    | 'none'
    | 'invisible'
    | 'aggregate'
    | 'custom';
  customIcon?: IconType;
  color?: string;
  palette?: string[] | Array<{ color: string; stop: number }>;
}

export type VisualizationDimensionGroupConfig = SharedDimensionProps & {
  groupLabel: string;
  dimensionEditorGroupLabel?: string;
  groupTooltip?: string;

  /** ID is passed back to visualization. For example, `x` */
  groupId: string;
  accessors: AccessorConfig[];
  // currently used only on partition charts to display non-editable UI dimension trigger in the buckets group when multiple metrics exist
  fakeFinalAccessor?: {
    label: string;
  };
  supportsMoreColumns: boolean;
  dimensionsTooMany?: number;
  /** If required, a warning will appear if accessors are empty */
  requiredMinDimensionCount?: number;
  dataTestSubj?: string;
  prioritizedOperation?: string;
  suggestedValue?: () => number | undefined;

  /**
   * When the dimension editor is enabled for this group, all dimensions in the group
   * will render the extra tab for the dimension editor
   */
  enableDimensionEditor?: boolean;
  // if the visual order of dimension groups diverges from the intended nesting order, this property specifies the position of
  // this dimension group in the hierarchy. If not specified, the position of the dimension in the array is used. specified nesting
  // orders are always higher in the hierarchy than non-specified ones.
  nestingOrder?: number;
  // need a special flag to know when to pass the previous column on duplicating
  requiresPreviousColumnOnDuplicate?: boolean;
  supportStaticValue?: boolean;
  // used by text based datasource to restrict the field selection only to number fields for the metric dimensions
  isMetricDimension?: boolean;
  paramEditorCustomProps?: ParamEditorCustomProps;
  enableFormatSelector?: boolean;
  formatSelectorOptions?: FormatSelectorOptions; // only relevant if supportFieldFormat is true
  labels?: { buttonAriaLabel: string; buttonLabel: string };
};

export interface VisualizationDimensionChangeProps<T> {
  layerId: string;
  columnId: string;
  prevState: T;
  frame: FramePublicAPI;
}

export interface Suggestion<T = unknown, V = unknown> {
  visualizationId: string;
  datasourceState?: V;
  datasourceId?: string;
  columns: number;
  score: number;
  title: string;
  visualizationState: T;
  previewExpression?: Ast | string;
  previewIcon: IconType;
  hide?: boolean;
  changeType: TableChangeType;
  keptLayerIds: string[];
}

/**
 * Object passed to `getSuggestions` of a visualization.
 * It contains a possible table the current datasource could
 * provide and the state of the visualization if it is currently active.
 *
 * If the current datasource suggests multiple tables, `getSuggestions`
 * is called multiple times with separate `SuggestionRequest` objects.
 */
export interface SuggestionRequest<T = unknown> {
  /**
   * A table configuration the datasource could provide.
   */
  table: TableSuggestion;
  /**
   * State is only passed if the visualization is active.
   */
  state?: T;
  mainPalette?: PaletteOutput;
  isFromContext?: boolean;
  /**
   * The visualization needs to know which table is being suggested
   */
  keptLayerIds: string[];
  /**
   * Different suggestions can be generated for each subtype of the visualization
   */
  subVisualizationId?: string;
  activeData?: Record<string, Datatable>;
}

/**
 * A possible configuration of a given visualization. It is based on a `TableSuggestion`.
 * Suggestion might be shown in the UI to be chosen by the user directly, but they are
 * also applied directly under some circumstances (dragging in the first field from the data
 * panel or switching to another visualization in the chart switcher).
 */
export interface VisualizationSuggestion<T = unknown> {
  /**
   * The score of a suggestion should indicate how valuable the suggestion is. It is used
   * to rank multiple suggestions of multiple visualizations. The number should be between 0 and 1
   */
  score: number;
  /**
   * Flag indicating whether this suggestion should not be advertised to the user. It is still
   * considered in scenarios where the available suggestion with the highest suggestion is applied
   * directly.
   */
  hide?: boolean;
  /**
   * Descriptive title of the suggestion. Should be as short as possible. This title is shown if
   * the suggestion is advertised to the user and will also show either the `previewExpression` or
   * the `previewIcon`
   */
  title: string;
  /**
   * The new state of the visualization if this suggestion is applied.
   */
  state: T;
  /**
   * An EUI icon type shown instead of the preview expression.
   */
  previewIcon: IconType;
}

export type DatasourceLayers = Partial<Record<string, DatasourcePublicAPI>>;

export interface FramePublicAPI {
  datasourceLayers: DatasourceLayers;
  dateRange: DateRange;
  /**
   * Data of the chart currently rendered in the preview.
   * This data might be not available (e.g. if the chart can't be rendered) or outdated and belonging to another chart.
   * If accessing, make sure to check whether expected columns actually exist.
   */
  activeData?: Record<string, Datatable>;
  dataViews: DataViewsState;
}

export interface FrameDatasourceAPI extends FramePublicAPI {
  query: Query;
  filters: Filter[];
}

/**
 * A visualization type advertised to the user in the chart switcher
 */
export interface VisualizationType {
  /**
   * Unique id of the visualization type within the visualization defining it
   */
  id: string;
  /**
   * Icon used in the chart switcher
   */
  icon: IconType;
  /**
   * Visible label used in the chart switcher and above the workspace panel in collapsed state
   */
  label: string;
  /**
   * Optional label used in visualization type search if chart switcher is expanded and for tooltips
   */
  fullLabel?: string;
  /**
   * The group the visualization belongs to
   */
  groupLabel: string;
  /**
   * The priority of the visualization in the list (global priority)
   * Higher number means higher priority. When omitted defaults to 0
   */
  sortPriority?: number;
  /**
   * Indicates if visualization is in the experimental stage.
   */
  showExperimentalBadge?: boolean;
}

export interface VisualizationDisplayOptions {
  noPanelTitle?: boolean;
  noPadding?: boolean;
}

interface VisualizationStateFromContextChangeProps {
  suggestions: Suggestion[];
  context: VisualizeEditorContext;
}

export interface Visualization<T = unknown, P = unknown> {
  /** Plugin ID, such as "lnsXY" */
  id: string;

  /**
   * Initialize is allowed to modify the state stored in memory. The initialize function
   * is called with a previous state in two cases:
   * - Loading from a saved visualization
   * - When using suggestions, the suggested state is passed in
   */
  initialize: (addNewLayer: () => string, state?: T, mainPalette?: PaletteOutput) => T;

  getUsedDataView?: (state: T, layerId: string) => string | undefined;
  /**
   * Retrieve the used DataViews in the visualization
   */
  getUsedDataViews?: (state?: T) => string[];

  getMainPalette?: (state: T) => undefined | PaletteOutput;

  /**
   * Supported triggers of this visualization type when embedded somewhere
   */
  triggers?: string[];
  /**
   * Visualizations must provide at least one type for the chart switcher,
   * but can register multiple subtypes
   */
  visualizationTypes: VisualizationType[];
  /**
   * Return the ID of the current visualization. Used to highlight
   * the active subtype of the visualization.
   */
  getVisualizationTypeId: (state: T) => string;
  /**
   * If the visualization has subtypes, update the subtype in state.
   */
  switchVisualizationType?: (visualizationTypeId: string, state: T) => T;
  /** Description is displayed as the clickable text in the chart switcher */
  getDescription: (state: T) => { icon?: IconType; label: string };
  /** Visualizations can have references as well */
  getPersistableState?: (state: T) => { state: P; savedObjectReferences: SavedObjectReference[] };
  /** Hydrate from persistable state and references to final state */
  fromPersistableState?: (
    state: P,
    references?: SavedObjectReference[],
    initialContext?: VisualizeFieldContext | VisualizeEditorContext
  ) => T;
  /** Frame needs to know which layers the visualization is currently using */
  getLayerIds: (state: T) => string[];
  /** Reset button on each layer triggers this */
  clearLayer: (state: T, layerId: string, indexPatternId: string) => T;
  /** Reset button on each layer triggers this */
  cloneLayer?: (
    state: T,
    layerId: string,
    newLayerId: string,
    /** @param contains map old -> new id **/
    clonedIDsMap: Map<string, string>
  ) => T;
  /** Optional, if the visualization supports multiple layers */
  removeLayer?: (state: T, layerId: string) => T;
  /** Track added layers in internal state */
  appendLayer?: (state: T, layerId: string, type: LayerType, indexPatternId: string) => T;

  /** Retrieve a list of supported layer types with initialization data */
  getSupportedLayers: (
    state?: T,
    frame?: Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>
  ) => Array<{
    type: LayerType;
    label: string;
    icon?: IconType;
    noDatasource?: boolean;
    disabled?: boolean;
    toolTipContent?: string;
    initialDimensions?: Array<{
      columnId: string;
      groupId: string;
      staticValue?: unknown;
      autoTimeField?: boolean;
    }>;
    canAddViaMenu?: boolean;
  }>;
  /**
   * returns a list of custom actions supported by the visualization layer.
   * Default actions like delete/clear are not included in this list and are managed by the editor frame
   * */
  getSupportedActionsForLayer?: (layerId: string, state: T) => LayerActionFromVisualization[];

  /**
   * Perform state mutations in response to a layer action
   */
  onLayerAction?: (layerId: string, actionId: string, state: T) => T;

  /** returns the type string of the given layer */
  getLayerType: (layerId: string, state?: T) => LayerType | undefined;

  /**
   * Get the layers this one should be linked to (currently that means just keeping the data view in sync)
   */
  getLayersToLinkTo?: (state: T, newLayerId: string) => string[];

  /**
   * Returns a set of dimensions that should be kept in sync
   */
  getLinkedDimensions?: (state: T) => DimensionLink[];

  /* returns the type of removal operation to perform for the specific layer in the current state */
  getRemoveOperation?: (state: T, layerId: string) => 'remove' | 'clear';

  /**
   * For consistency across different visualizations, the dimension configuration UI is standardized
   */
  getConfiguration: (props: VisualizationConfigProps<T>) => {
    hidden?: boolean;
    groups: VisualizationDimensionGroupConfig[];
  };

  /**
   * Header rendered as layer title. This can be used for both static and dynamic content like
   * for extra configurability, such as for switch chart type
   */
  renderLayerHeader?: (
    domElement: Element,
    props: VisualizationLayerWidgetProps<T>
  ) => ((cleanupElement: Element) => void) | void;

  /**
   * Layer panel content rendered. This can be used to render a custom content below the title,
   * like a custom dataview switch
   */
  renderLayerPanel?: (
    domElement: Element,
    props: VisualizationLayerWidgetProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  /**
   * Toolbar rendered above the visualization. This is meant to be used to provide chart-level
   * settings for the visualization.
   */
  renderToolbar?: (
    domElement: Element,
    props: VisualizationToolbarProps<T>
  ) => ((cleanupElement: Element) => void) | void;

  /**
   * The frame is telling the visualization to update or set a dimension based on user interaction
   * groupId is coming from the groupId provided in getConfiguration
   */
  setDimension: (
    props: VisualizationDimensionChangeProps<T> & { groupId: string; previousColumn?: string }
  ) => T;
  /**
   * The frame is telling the visualization to remove a dimension. The visualization needs to
   * look at its internal state to determine which dimension is being affected.
   */
  removeDimension: (props: VisualizationDimensionChangeProps<T>) => T;
  /**
   * Allow defining custom behavior for the visualization when the drop action occurs.
   */
  onDrop?: (props: {
    prevState: T;
    target: DragDropOperation;
    source: DragDropIdentifier;
    frame: FramePublicAPI;
    dropType: DropType;
    group?: VisualizationDimensionGroupConfig;
  }) => T;

  getDropProps?: (
    dropProps: GetDropPropsArgs
  ) => { dropTypes: DropType[]; nextLabel?: string } | undefined;

  /**
   * Allows the visualization to announce whether or not it has any settings to show
   */
  hasLayerSettings?: (props: VisualizationConfigProps<T>) => boolean;

  renderLayerSettings?: (
    domElement: Element,
    props: VisualizationLayerSettingsProps<T>
  ) => ((cleanupElement: Element) => void) | void;

  /**
   * Additional editor that gets rendered inside the dimension popover in the "appearance" section.
   * This can be used to configure dimension-specific options
   */
  renderDimensionEditor?: (
    domElement: Element,
    props: VisualizationDimensionEditorProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  /**
   * Additional editor that gets rendered inside the dimension popover in an additional section below "appearance".
   * This can be used to configure dimension-specific options
   */
  renderDimensionEditorAdditionalSection?: (
    domElement: Element,
    props: VisualizationDimensionEditorProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  /**
   * Additional editor that gets rendered inside the data section.
   * This can be used to configure dimension-specific options
   */
  renderDimensionEditorDataExtra?: (
    domElement: Element,
    props: VisualizationDimensionEditorProps<T>
  ) => ((cleanupElement: Element) => void) | void;
  /**
   * Renders dimension trigger. Used only for noDatasource layers
   */
  renderDimensionTrigger?: (props: {
    columnId: string;
    label: string;
    hideTooltip?: boolean;
    invalid?: boolean;
    invalidMessage?: string | React.ReactNode;
  }) => JSX.Element | null;
  /**
   * Creates map of columns ids and unique lables. Used only for noDatasource layers
   */
  getUniqueLabels?: (state: T) => Record<string, string>;
  /**
   * The frame will call this function on all visualizations at different times. The
   * main use cases where visualization suggestions are requested are:
   * - When dragging a field
   * - When opening the chart switcher
   * If the state is provided when requesting suggestions, the visualization is active.
   * Most visualizations will apply stricter filtering to suggestions when they are active,
   * because suggestions have the potential to remove the users's work in progress.
   */
  getSuggestions: (context: SuggestionRequest<T>) => Array<VisualizationSuggestion<T>>;

  toExpression: (
    state: T,
    datasourceLayers: DatasourceLayers,
    attributes?: Partial<{ title: string; description: string }>,
    datasourceExpressionsByLayers?: Record<string, Ast>
  ) => ExpressionAstExpression | string | null;
  /**
   * Expression to render a preview version of the chart in very constrained space.
   * If there is no expression provided, the preview icon is used.
   */
  toPreviewExpression?: (
    state: T,
    datasourceLayers: DatasourceLayers,
    datasourceExpressionsByLayers?: Record<string, Ast>
  ) => ExpressionAstExpression | string | null;

  /**
   * The frame will call this function on all visualizations at few stages (pre-build/build error) in order
   * to provide more context to the error and show it to the user
   */
  getUserMessages?: (state: T, deps: { frame: FramePublicAPI }) => UserMessage[];

  /**
   * On Edit events the frame will call this to know what's going to be the next visualization state
   */
  onEditAction?: (state: T, event: LensEditEvent<LensEditSupportedActions>) => T;

  /**
   * Some visualization track indexPattern changes (i.e. annotations)
   * This method makes it aware of the change and produces a new updated state
   */
  onIndexPatternChange?: (state: T, indexPatternId: string, layerId?: string) => T;
  onIndexPatternRename?: (state: T, oldIndexPatternId: string, newIndexPatternId: string) => T;
  getLayersToRemoveOnIndexPatternChange?: (state: T) => string[];
  /**
   * Gets custom display options for showing the visualization.
   */
  getDisplayOptions?: () => VisualizationDisplayOptions;

  /**
   * Get RenderEventCounters events for telemetry
   */
  getRenderEventCounters?: (state: T) => string[];

  getSuggestionFromConvertToLensContext?: (
    props: VisualizationStateFromContextChangeProps
  ) => Suggestion<T> | undefined;

  getVisualizationInfo?: (state: T) => VisualizationInfo;
}

// Use same technique as TriggerContext
export interface LensEditContextMapping {
  [LENS_EDIT_SORT_ACTION]: LensSortActionData;
  [LENS_EDIT_RESIZE_ACTION]: LensResizeActionData;
  [LENS_TOGGLE_ACTION]: LensToggleActionData;
  [LENS_EDIT_PAGESIZE_ACTION]: LensPagesizeActionData;
}

type LensEditSupportedActions = keyof LensEditContextMapping;

export type LensEditPayload<T extends LensEditSupportedActions> = {
  action: T;
} & LensEditContextMapping[T];

type EditPayloadContext<T> = T extends LensEditSupportedActions ? LensEditPayload<T> : never;

export interface LensEditEvent<T> {
  name: 'edit';
  data: EditPayloadContext<T>;
}

export interface LensTableRowContextMenuEvent {
  name: 'tableRowContextMenuClick';
  data: RowClickContext['data'];
}

export function isLensFilterEvent(event: ExpressionRendererEvent): event is ClickTriggerEvent {
  return event.name === 'filter';
}

export function isLensMultiFilterEvent(
  event: ExpressionRendererEvent
): event is MultiClickTriggerEvent {
  return event.name === 'multiFilter';
}

export function isLensBrushEvent(event: ExpressionRendererEvent): event is BrushTriggerEvent {
  return event.name === 'brush';
}

export function isLensEditEvent<T extends LensEditSupportedActions>(
  event: ExpressionRendererEvent
): event is LensEditEvent<T> {
  return event.name === 'edit';
}

export function isLensTableRowContextMenuClickEvent(
  event: ExpressionRendererEvent
): event is LensTableRowContextMenuEvent {
  return event.name === 'tableRowContextMenuClick';
}

/**
 * Expression renderer handlers specifically for lens renderers. This is a narrowed down
 * version of the general render handlers, specifying supported event types. If this type is
 * used, dispatched events will be handled correctly.
 */
export interface ILensInterpreterRenderHandlers extends IInterpreterRenderHandlers {
  event: (
    event:
      | ClickTriggerEvent
      | BrushTriggerEvent
      | LensEditEvent<LensEditSupportedActions>
      | LensTableRowContextMenuEvent
  ) => void;
}

export interface SharingSavedObjectProps {
  outcome?: ResolvedSimpleSavedObject['outcome'];
  aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
  sourceId?: string;
}

/**
 * Configuration of a top nav entry which can be shown for specific scenarios given a certain combination of active datasource and visualization id.
 * This function gets passed the currently active visualization id and state as well as the current datasource states.
 *
 * If it returns a top nav menu entry, it is rendered along with the native Lens menu entries
 */
export type LensTopNavMenuEntryGenerator = (props: {
  visualizationId: string;
  datasourceStates: Record<string, { state: unknown }>;
  visualizationState: unknown;
  query: Query;
  filters: Filter[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  currentDoc: Document | undefined;
}) => undefined | TopNavMenuData;

export interface LensCellValueAction {
  id: string;
  iconType: string;
  displayName: string;
  execute: (data: CellValueContext['data']) => void;
}

export type GetCompatibleCellValueActions = (
  data: CellValueContext['data']
) => Promise<LensCellValueAction[]>;
