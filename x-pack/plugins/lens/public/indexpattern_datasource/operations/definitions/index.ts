/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup, CoreStart } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { termsOperation } from './terms';
import { filtersOperation } from './filters';
import { cardinalityOperation } from './cardinality';
import { percentileOperation } from './percentile';
import {
  minOperation,
  averageOperation,
  sumOperation,
  maxOperation,
  medianOperation,
} from './metrics';
import { dateHistogramOperation } from './date_histogram';
import {
  cumulativeSumOperation,
  counterRateOperation,
  derivativeOperation,
  movingAverageOperation,
  overallSumOperation,
  overallMinOperation,
  overallMaxOperation,
  overallAverageOperation,
  timeScaleOperation,
} from './calculations';
import { countOperation } from './count';
import { mathOperation, formulaOperation } from './formula';
import { staticValueOperation } from './static_value';
import { lastValueOperation } from './last_value';
import { FrameDatasourceAPI, OperationMetadata, ParamEditorCustomProps } from '../../../types';
import type {
  BaseIndexPatternColumn,
  IncompleteColumn,
  GenericIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
} from './column_types';
import { IndexPattern, IndexPatternField, IndexPatternLayer } from '../../types';
import { DateRange, LayerType } from '../../../../common';
import { ExpressionAstFunction } from '../../../../../../../src/plugins/expressions/public';
import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { rangeOperation } from './ranges';
import { IndexPatternDimensionEditorProps, OperationSupportMatrix } from '../../dimension_panel';

export type {
  IncompleteColumn,
  BaseIndexPatternColumn,
  GenericIndexPatternColumn,
  FieldBasedIndexPatternColumn,
} from './column_types';

export type { TermsIndexPatternColumn } from './terms';
export type { FiltersIndexPatternColumn, Filter } from './filters';
export type { CardinalityIndexPatternColumn } from './cardinality';
export type { PercentileIndexPatternColumn } from './percentile';
export type {
  MinIndexPatternColumn,
  AvgIndexPatternColumn,
  SumIndexPatternColumn,
  MaxIndexPatternColumn,
  MedianIndexPatternColumn,
} from './metrics';
export type { DateHistogramIndexPatternColumn } from './date_histogram';
export type {
  CumulativeSumIndexPatternColumn,
  CounterRateIndexPatternColumn,
  DerivativeIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  OverallSumIndexPatternColumn,
  OverallMinIndexPatternColumn,
  OverallMaxIndexPatternColumn,
  OverallAverageIndexPatternColumn,
  TimeScaleIndexPatternColumn,
} from './calculations';
export type { CountIndexPatternColumn } from './count';
export type { LastValueIndexPatternColumn } from './last_value';
export type { RangeIndexPatternColumn } from './ranges';
export type { FormulaIndexPatternColumn, MathIndexPatternColumn } from './formula';
export type { StaticValueIndexPatternColumn } from './static_value';

// List of all operation definitions registered to this data source.
// If you want to implement a new operation, add the definition to this array and
// the column type to the `GenericIndexPatternColumn` union type below.
const internalOperationDefinitions = [
  filtersOperation,
  termsOperation,
  dateHistogramOperation,
  minOperation,
  maxOperation,
  averageOperation,
  cardinalityOperation,
  sumOperation,
  medianOperation,
  percentileOperation,
  lastValueOperation,
  countOperation,
  rangeOperation,
  cumulativeSumOperation,
  counterRateOperation,
  derivativeOperation,
  movingAverageOperation,
  mathOperation,
  formulaOperation,
  overallSumOperation,
  overallMinOperation,
  overallMaxOperation,
  overallAverageOperation,
  staticValueOperation,
  timeScaleOperation,
];

export { termsOperation } from './terms';
export { rangeOperation } from './ranges';
export { filtersOperation } from './filters';
export { dateHistogramOperation } from './date_histogram';
export { minOperation, averageOperation, sumOperation, maxOperation } from './metrics';
export { percentileOperation } from './percentile';
export { countOperation } from './count';
export { lastValueOperation } from './last_value';
export {
  cumulativeSumOperation,
  counterRateOperation,
  derivativeOperation,
  movingAverageOperation,
  overallSumOperation,
  overallAverageOperation,
  overallMaxOperation,
  overallMinOperation,
  timeScaleOperation,
} from './calculations';
export { formulaOperation } from './formula/formula';
export { staticValueOperation } from './static_value';

/**
 * Properties passed to the operation-specific part of the popover editor
 */
export interface ParamEditorProps<C> {
  currentColumn: C;
  layer: IndexPatternLayer;
  updateLayer: (
    setter: IndexPatternLayer | ((prevLayer: IndexPatternLayer) => IndexPatternLayer)
  ) => void;
  toggleFullscreen: () => void;
  setIsCloseable: (isCloseable: boolean) => void;
  isFullscreen: boolean;
  columnId: string;
  layerId: string;
  indexPattern: IndexPattern;
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpSetup;
  dateRange: DateRange;
  data: DataPublicPluginStart;
  activeData?: IndexPatternDimensionEditorProps['activeData'];
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
  paramEditorCustomProps?: ParamEditorCustomProps;
}

export interface FieldInputProps<C> {
  layer: IndexPatternLayer;
  selectedColumn?: C;
  columnId: string;
  indexPattern: IndexPattern;
  updateLayer: (
    setter: IndexPatternLayer | ((prevLayer: IndexPatternLayer) => IndexPatternLayer)
  ) => void;
  onDeleteColumn?: () => void;
  currentFieldIsInvalid: boolean;
  incompleteField: IncompleteColumn['sourceField'] | null;
  incompleteOperation: IncompleteColumn['operationType'];
  incompleteParams: Omit<IncompleteColumn, 'sourceField' | 'operationType'>;
  dimensionGroups: IndexPatternDimensionEditorProps['dimensionGroups'];
  groupId: IndexPatternDimensionEditorProps['groupId'];
  /**
   * indexPatternId -> fieldName -> boolean
   */
  existingFields: Record<string, Record<string, boolean>>;
  operationSupportMatrix: OperationSupportMatrix;
  helpMessage?: React.ReactNode;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
}

export interface HelpProps<C> {
  currentColumn: C;
  uiSettings: IUiSettingsClient;
  data: DataPublicPluginStart;
}

export type TimeScalingMode = 'disabled' | 'mandatory' | 'optional';

interface BaseOperationDefinitionProps<C extends BaseIndexPatternColumn, P = {}> {
  type: C['operationType'];
  /**
   * The priority of the operation. If multiple operations are possible in
   * a given scenario (e.g. the user dragged a field into the workspace),
   * the operation with the highest priority is picked.
   */
  priority?: number;
  /**
   * The name of the operation shown to the user (e.g. in the popover editor).
   * Should be i18n-ified.
   */
  displayName: string;
  /**
   * The default label is assigned by the editor
   */
  getDefaultLabel: (
    column: C,
    indexPattern: IndexPattern,
    columns: Record<string, GenericIndexPatternColumn>
  ) => string;
  /**
   * This function is called if another column in the same layer changed or got added/removed.
   * Can be used to update references to other columns (e.g. for sorting).
   * Based on the current column and the other updated columns, this function has to
   * return an updated column. If not implemented, the `id` function is used instead.
   */
  onOtherColumnChanged?: (
    layer: IndexPatternLayer,
    thisColumnId: string,
    changedColumnId: string
  ) => C;
  /**
   * React component for operation specific settings shown in the flyout editor
   */
  paramEditor?: React.ComponentType<ParamEditorProps<C>>;
  /**
   * Returns true if the `column` can also be used on `newIndexPattern`.
   * If this function returns false, the column is removed when switching index pattern
   * for a layer
   */
  isTransferable: (
    column: C,
    newIndexPattern: IndexPattern,
    operationDefinitionMap: Record<string, GenericOperationDefinition>
  ) => boolean;
  /**
   * Transfering a column to another index pattern. This can be used to
   * adjust operation specific settings such as reacting to aggregation restrictions
   * present on the new index pattern.
   */
  transfer?: (column: C, newIndexPattern: IndexPattern) => C;
  /**
   * if there is some reason to display the operation in the operations list
   * but disable it from usage, this function returns the string describing
   * the status. Otherwise it returns undefined
   */
  getDisabledStatus?: (
    indexPattern: IndexPattern,
    layer: IndexPatternLayer,
    layerType?: LayerType
  ) => string | undefined;
  /**
   * Validate that the operation has the right preconditions in the state. For example:
   *
   * - Requires a date histogram operation somewhere before it in order
   * - Missing references
   */
  getErrorMessage?: (
    layer: IndexPatternLayer,
    columnId: string,
    indexPattern: IndexPattern,
    operationDefinitionMap?: Record<string, GenericOperationDefinition>
  ) =>
    | Array<
        | string
        | {
            message: string;
            fixAction?: {
              label: string;
              newState: (
                core: CoreStart,
                frame: FrameDatasourceAPI,
                layerId: string
              ) => Promise<IndexPatternLayer>;
            };
          }
      >
    | undefined;

  /*
   * Flag whether this operation can be scaled by time unit if a date histogram is available.
   * If set to mandatory or optional, a UI element is shown in the config flyout to configure the time unit
   * to scale by. The chosen unit will be persisted as `timeScale` property of the column.
   * If set to optional, time scaling won't be enabled by default and can be removed.
   */
  timeScalingMode?: TimeScalingMode;
  /**
   * Filterable operations can have a KQL or Lucene query added at the dimension level.
   * This flag is used by the formula to assign the kql= and lucene= named arguments and set up
   * autocomplete.
   */
  filterable?: boolean | { helpMessage: string };
  shiftable?: boolean;

  getHelpMessage?: (props: HelpProps<C>) => React.ReactNode;
  /*
   * Operations can be used as middleware for other operations, hence not shown in the panel UI
   */
  hidden?: boolean;
  documentation?: {
    signature: string;
    description: string;
    section: 'elasticsearch' | 'calculation';
  };
  /**
   * React component for operation field specific behaviour
   */
  renderFieldInput?: React.ComponentType<FieldInputProps<C>>;
  /**
   * Builds the correct parameter for field additions
   */
  getParamsForMultipleFields?: (props: {
    targetColumn: C;
    sourceColumn?: GenericIndexPatternColumn;
    field?: IndexPatternField;
    indexPattern: IndexPattern;
  }) => Partial<P>;
  /**
   * Verify if the a new field can be added to the column
   */
  canAddNewField?: (props: {
    targetColumn: C;
    sourceColumn?: GenericIndexPatternColumn;
    field?: IndexPatternField;
    indexPattern: IndexPattern;
  }) => boolean;
  /**
   * Returns the list of current fields for a multi field operation
   */
  getCurrentFields?: (targetColumn: C) => string[];
  /**
   * Operation can influence some visual default settings. This function is used to collect default values offered
   */
  getDefaultVisualSettings?: (column: C) => { truncateText?: boolean };

  /**
   * Utility function useful for multi fields operation in order to get fields
   * are not pass the transferable checks
   */
  getNonTransferableFields?: (column: C, indexPattern: IndexPattern) => string[];
}

interface BaseBuildColumnArgs {
  layer: IndexPatternLayer;
  indexPattern: IndexPattern;
}

interface OperationParam {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string | number;
}

interface FieldlessOperationDefinition<C extends BaseIndexPatternColumn, P = {}> {
  input: 'none';

  /**
   * The specification of the arguments used by the operations used for both validation,
   * and use from external managed operations
   */
  operationParams?: OperationParam[];
  /**
   * Builds the column object for the given parameters. Should include default p
   */
  buildColumn: (
    arg: BaseBuildColumnArgs & {
      previousColumn?: GenericIndexPatternColumn;
    },
    columnParams?: P
  ) => C;
  /**
   * Returns the meta data of the operation if applied. Undefined
   * if the field is not applicable.
   */
  getPossibleOperation: () => OperationMetadata;
  /**
   * Function turning a column into an agg config passed to the `esaggs` function
   * together with the agg configs returned from other columns.
   */
  toEsAggsFn: (
    column: C,
    columnId: string,
    indexPattern: IndexPattern,
    layer: IndexPatternLayer,
    uiSettings: IUiSettingsClient
  ) => ExpressionAstFunction;
}

interface FieldBasedOperationDefinition<C extends BaseIndexPatternColumn, P = {}> {
  input: 'field';

  /**
   * The specification of the arguments used by the operations used for both validation,
   * and use from external managed operations
   */
  operationParams?: OperationParam[];
  /**
   * Returns the meta data of the operation if applied to the given field. Undefined
   * if the field is not applicable to the operation.
   */
  getPossibleOperationForField: (field: IndexPatternField) => OperationMetadata | undefined;
  /**
   * Builds the column object for the given parameters.
   */
  buildColumn: (
    arg: BaseBuildColumnArgs & {
      field: IndexPatternField;
      previousColumn?: GenericIndexPatternColumn;
    },
    columnParams?: P & {
      kql?: string;
      lucene?: string;
      shift?: string;
    }
  ) => C;
  /**
   * This method will be called if the user changes the field of an operation.
   * You must implement it and return the new column after the field change.
   * The most simple implementation will just change the field on the column, and keep
   * the rest the same. Some implementations might want to change labels, or their parameters
   * when changing the field.
   *
   * This will only be called for switching the field, not for initially selecting a field.
   *
   * See {@link OperationDefinition#transfer} for controlling column building when switching an
   * index pattern not just a field.
   *
   * @param oldColumn The column before the user changed the field.
   * @param field The field that the user changed to.
   * @param params An additional set of params
   */
  onFieldChange: (oldColumn: C, field: IndexPatternField, params?: Partial<P>) => C;
  /**
   * Function turning a column into an agg config passed to the `esaggs` function
   * together with the agg configs returned from other columns.
   */
  toEsAggsFn: (
    column: C,
    columnId: string,
    indexPattern: IndexPattern,
    layer: IndexPatternLayer,
    uiSettings: IUiSettingsClient,
    orderedColumnIds: string[]
  ) => ExpressionAstFunction;
  /**
   * Validate that the operation has the right preconditions in the state. For example:
   *
   * - Requires a date histogram operation somewhere before it in order
   * - Missing references
   */
  getErrorMessage?: (
    layer: IndexPatternLayer,
    columnId: string,
    indexPattern: IndexPattern,
    operationDefinitionMap?: Record<string, GenericOperationDefinition>
  ) =>
    | Array<
        | string
        | {
            message: string;
            fixAction?: {
              label: string;
              newState: (
                core: CoreStart,
                frame: FrameDatasourceAPI,
                layerId: string
              ) => Promise<IndexPatternLayer>;
            };
          }
      >
    | undefined;
}

export interface RequiredReference {
  // Limit the input types, usually used to prevent other references from being used
  input: Array<GenericOperationDefinition['input']>;
  // Function which is used to determine if the reference is bucketed, or if it's a number
  validateMetadata: (metadata: OperationMetadata) => boolean;
  // Do not use specificOperations unless you need to limit to only one or two exact
  // operation types. The main use case is Cumulative Sum, where we need to only take the
  // sum of Count or sum of Sum.
  specificOperations?: OperationType[];
  multi?: boolean;
}

// Full reference uses one or more reference operations which are visible to the user
// Partial reference is similar except that it uses the field selector
interface FullReferenceOperationDefinition<C extends BaseIndexPatternColumn> {
  input: 'fullReference';
  /**
   * The filters provided here are used to construct the UI, transition correctly
   * between operations, and validate the configuration.
   */
  requiredReferences: RequiredReference[];

  /**
   * The specification of the arguments used by the operations used for both validation,
   * and use from external managed operations
   */
  operationParams?: OperationParam[];

  /**
   * The type of UI that is shown in the editor for this function:
   * - full: List of sub-functions and fields
   * - field: List of fields, selects first operation per field
   * - hidden: Do not allow to use operation directly
   */
  selectionStyle: 'full' | 'field' | 'hidden';

  /**
   * Builds the column object for the given parameters. Should include default p
   */
  buildColumn: (
    arg: BaseBuildColumnArgs & {
      referenceIds: string[];
      previousColumn?: GenericIndexPatternColumn;
    },
    columnParams?: (ReferenceBasedIndexPatternColumn & C)['params'] & {
      kql?: string;
      lucene?: string;
      shift?: string;
    }
  ) => ReferenceBasedIndexPatternColumn & C;
  /**
   * Returns the meta data of the operation if applied. Undefined
   * if the operation can't be added with these fields.
   */
  getPossibleOperation: (indexPattern: IndexPattern) => OperationMetadata | undefined;
  /**
   * A chain of expression functions which will transform the table
   */
  toExpression: (
    layer: IndexPatternLayer,
    columnId: string,
    indexPattern: IndexPattern
  ) => ExpressionAstFunction[];
}

interface ManagedReferenceOperationDefinition<C extends BaseIndexPatternColumn> {
  input: 'managedReference';
  /**
   * Builds the column object for the given parameters. Should include default p
   */
  buildColumn: (
    arg: BaseBuildColumnArgs & {
      previousColumn?: GenericIndexPatternColumn;
    },
    columnParams?: (ReferenceBasedIndexPatternColumn & C)['params'],
    operationDefinitionMap?: Record<string, GenericOperationDefinition>
  ) => ReferenceBasedIndexPatternColumn & C;
  /**
   * Returns the meta data of the operation if applied. Undefined
   * if the operation can't be added with these fields.
   */
  getPossibleOperation: () => OperationMetadata | undefined;
  /**
   * A chain of expression functions which will transform the table
   */
  toExpression: (
    layer: IndexPatternLayer,
    columnId: string,
    indexPattern: IndexPattern
  ) => ExpressionAstFunction[];
  /**
   * Managed references control the IDs of their inner columns, so we need to be able to copy from the
   * root level
   */
  createCopy: (
    layer: IndexPatternLayer,
    sourceColumnId: string,
    targetColumnId: string,
    indexPattern: IndexPattern,
    operationDefinitionMap: Record<string, GenericOperationDefinition>
  ) => IndexPatternLayer;
}

interface OperationDefinitionMap<C extends BaseIndexPatternColumn, P = {}> {
  field: FieldBasedOperationDefinition<C, P>;
  none: FieldlessOperationDefinition<C, P>;
  fullReference: FullReferenceOperationDefinition<C>;
  managedReference: ManagedReferenceOperationDefinition<C>;
}

/**
 * Shape of an operation definition. If the type parameter of the definition
 * indicates a field based column, `getPossibleOperationForField` has to be
 * specified, otherwise `getPossibleOperation` has to be defined.
 */
export type OperationDefinition<
  C extends BaseIndexPatternColumn,
  Input extends keyof OperationDefinitionMap<C>,
  P = {}
> = BaseOperationDefinitionProps<C> & OperationDefinitionMap<C, P>[Input];

/**
 * A union type of all available operation types. The operation type is a unique id of an operation.
 * Each column is assigned to exactly one operation type.
 */
export type OperationType = string;

/**
 * This is an operation definition of an unspecified column out of all possible
 * column types.
 */
export type GenericOperationDefinition =
  | OperationDefinition<BaseIndexPatternColumn, 'field'>
  | OperationDefinition<BaseIndexPatternColumn, 'none'>
  | OperationDefinition<BaseIndexPatternColumn, 'fullReference'>
  | OperationDefinition<BaseIndexPatternColumn, 'managedReference'>;

/**
 * List of all available operation definitions
 */
export const operationDefinitions = internalOperationDefinitions as GenericOperationDefinition[];

/**
 * Map of all operation visible to consumers (e.g. the dimension panel).
 * This simplifies the type of the map and makes it a simple list of unspecified
 * operations definitions, because typescript can't infer the type correctly in most
 * situations.
 *
 * If you need a specifically typed version of an operation (e.g. explicitly working with terms),
 * you should import the definition directly from this file
 * (e.g. `import { termsOperation } from './operations/definitions'`). This map is
 * intended to be used in situations where the operation type is not known during compile time.
 */
export const operationDefinitionMap: Record<string, GenericOperationDefinition> =
  internalOperationDefinitions.reduce(
    (definitionMap, definition) => ({ ...definitionMap, [definition.type]: definition }),
    {}
  );

/**
 * Cannot map the prev names, but can guarantee the new names are matching up using the type system
 */
export const renameOperationsMapping: Record<string, GenericOperationDefinition['type']> = {
  avg: 'average',
  cardinality: 'unique_count',
};
