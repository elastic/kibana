/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionAST } from '@kbn/interpreter/common';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { termsOperation, TermsIndexPatternColumn } from './terms';
import { filtersOperation, FiltersIndexPatternColumn } from './filters';
import { cardinalityOperation, CardinalityIndexPatternColumn } from './cardinality';
import {
  minOperation,
  MinIndexPatternColumn,
  averageOperation,
  AvgIndexPatternColumn,
  sumOperation,
  SumIndexPatternColumn,
  maxOperation,
  MaxIndexPatternColumn,
  medianOperation,
  MedianIndexPatternColumn,
} from './metrics';
import { dateHistogramOperation, DateHistogramIndexPatternColumn } from './date_histogram';
import { countOperation, CountIndexPatternColumn } from './count';
import { StateSetter, OperationMetadata } from '../../../types';
import type { BaseIndexPatternColumn, ReferenceBasedIndexPatternColumn } from './column_types';
import {
  IndexPatternPrivateState,
  IndexPattern,
  IndexPatternField,
  IndexPatternLayer,
} from '../../types';
import { DateRange } from '../../../../common';
import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { RangeIndexPatternColumn, rangeOperation } from './ranges';

/**
 * A union type of all available column types. If a column is of an unknown type somewhere
 * withing the indexpattern data source it should be typed as `IndexPatternColumn` to make
 * typeguards possible that consider all available column types.
 */
export type IndexPatternColumn =
  | FiltersIndexPatternColumn
  | RangeIndexPatternColumn
  | TermsIndexPatternColumn
  | DateHistogramIndexPatternColumn
  | MinIndexPatternColumn
  | MaxIndexPatternColumn
  | AvgIndexPatternColumn
  | CardinalityIndexPatternColumn
  | SumIndexPatternColumn
  | MedianIndexPatternColumn
  | CountIndexPatternColumn;

export type FieldBasedIndexPatternColumn = Extract<IndexPatternColumn, { sourceField: string }>;

export { IncompleteColumn } from './column_types';

// List of all operation definitions registered to this data source.
// If you want to implement a new operation, add the definition to this array and
// the column type to the `IndexPatternColumn` union type below.
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
  countOperation,
  rangeOperation,
];

export { termsOperation } from './terms';
export { rangeOperation } from './ranges';
export { filtersOperation } from './filters';
export { dateHistogramOperation } from './date_histogram';
export { minOperation, averageOperation, sumOperation, maxOperation } from './metrics';
export { countOperation } from './count';

/**
 * Properties passed to the operation-specific part of the popover editor
 */
export interface ParamEditorProps<C> {
  currentColumn: C;
  state: IndexPatternPrivateState;
  setState: StateSetter<IndexPatternPrivateState>;
  columnId: string;
  layerId: string;
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpSetup;
  dateRange: DateRange;
  data: DataPublicPluginStart;
}

export type TimeScalingMode = 'disabled' | 'mandatory' | 'optional';

interface BaseOperationDefinitionProps<C extends BaseIndexPatternColumn> {
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
    columns: Record<string, IndexPatternColumn>
  ) => string;
  /**
   * This function is called if another column in the same layer changed or got removed.
   * Can be used to update references to other columns (e.g. for sorting).
   * Based on the current column and the other updated columns, this function has to
   * return an updated column. If not implemented, the `id` function is used instead.
   */
  onOtherColumnChanged?: (
    currentColumn: C,
    columns: Partial<Record<string, IndexPatternColumn>>
  ) => C;
  /**
   * React component for operation specific settings shown in the popover editor
   */
  paramEditor?: React.ComponentType<ParamEditorProps<C>>;
  /**
   * Returns true if the `column` can also be used on `newIndexPattern`.
   * If this function returns false, the column is removed when switching index pattern
   * for a layer
   */
  isTransferable: (column: C, newIndexPattern: IndexPattern) => boolean;
  /**
   * Transfering a column to another index pattern. This can be used to
   * adjust operation specific settings such as reacting to aggregation restrictions
   * present on the new index pattern.
   */
  transfer?: (column: C, newIndexPattern: IndexPattern) => C;
  /**
   * Flag whether this operation can be scaled by time unit if a date histogram is available.
   * If set to mandatory or optional, a UI element is shown in the config flyout to configure the time unit
   * to scale by. The chosen unit will be persisted as `timeScale` property of the column.
   * If set to optional, time scaling won't be enabled by default and can be removed.
   */
  timeScalingMode?: TimeScalingMode;
}

interface BaseBuildColumnArgs {
  layer: IndexPatternLayer;
  indexPattern: IndexPattern;
}

interface FieldlessOperationDefinition<C extends BaseIndexPatternColumn> {
  input: 'none';
  /**
   * Builds the column object for the given parameters. Should include default p
   */
  buildColumn: (
    arg: BaseBuildColumnArgs & {
      previousColumn?: IndexPatternColumn;
    }
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
  toEsAggsConfig: (column: C, columnId: string, indexPattern: IndexPattern) => unknown;
}

interface FieldBasedOperationDefinition<C extends BaseIndexPatternColumn> {
  input: 'field';
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
      previousColumn?: IndexPatternColumn;
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
   */
  onFieldChange: (oldColumn: C, field: IndexPatternField) => C;
  /**
   * Function turning a column into an agg config passed to the `esaggs` function
   * together with the agg configs returned from other columns.
   */
  toEsAggsConfig: (column: C, columnId: string, indexPattern: IndexPattern) => unknown;
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
   * The type of UI that is shown in the editor for this function:
   * - full: List of sub-functions and fields
   * - field: List of fields, selects first operation per field
   */
  selectionStyle: 'full' | 'field';

  /**
   * Builds the column object for the given parameters. Should include default p
   */
  buildColumn: (
    arg: BaseBuildColumnArgs & {
      referenceIds: string[];
      previousColumn?: IndexPatternColumn;
    }
  ) => ReferenceBasedIndexPatternColumn & C;
  /**
   * Returns the meta data of the operation if applied. Undefined
   * if the field is not applicable.
   */
  getPossibleOperation: () => OperationMetadata;
  /**
   * A chain of expression functions which will transform the table
   */
  toExpression: (
    layer: IndexPatternLayer,
    columnId: string,
    indexPattern: IndexPattern
  ) => ExpressionFunctionAST[];
  /**
   * Validate that the operation has the right preconditions in the state. For example:
   *
   * - Requires a date histogram operation somewhere before it in order
   * - Missing references
   */
  getErrorMessage?: (layer: IndexPatternLayer, columnId: string) => string[] | undefined;
}

interface OperationDefinitionMap<C extends BaseIndexPatternColumn> {
  field: FieldBasedOperationDefinition<C>;
  none: FieldlessOperationDefinition<C>;
  fullReference: FullReferenceOperationDefinition<C>;
}

/**
 * Shape of an operation definition. If the type parameter of the definition
 * indicates a field based column, `getPossibleOperationForField` has to be
 * specified, otherwise `getPossibleOperation` has to be defined.
 */
export type OperationDefinition<
  C extends BaseIndexPatternColumn,
  Input extends keyof OperationDefinitionMap<C>
> = BaseOperationDefinitionProps<C> & OperationDefinitionMap<C>[Input];

/**
 * A union type of all available operation types. The operation type is a unique id of an operation.
 * Each column is assigned to exactly one operation type.
 */
export type OperationType = typeof internalOperationDefinitions[number]['type'];

/**
 * This is an operation definition of an unspecified column out of all possible
 * column types.
 */
export type GenericOperationDefinition =
  | OperationDefinition<IndexPatternColumn, 'field'>
  | OperationDefinition<IndexPatternColumn, 'none'>
  | OperationDefinition<IndexPatternColumn, 'fullReference'>;

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
export const operationDefinitionMap: Record<
  string,
  GenericOperationDefinition
> = internalOperationDefinitions.reduce(
  (definitionMap, definition) => ({ ...definitionMap, [definition.type]: definition }),
  {}
);
