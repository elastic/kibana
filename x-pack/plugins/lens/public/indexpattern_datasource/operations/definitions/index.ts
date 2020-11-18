/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import { lastValueOperation, LastValueIndexPatternColumn } from './last_value';
import { StateSetter, OperationMetadata } from '../../../types';
import { BaseIndexPatternColumn } from './column_types';
import { IndexPatternPrivateState, IndexPattern, IndexPatternField } from '../../types';
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
  | CountIndexPatternColumn
  | LastValueIndexPatternColumn;

export type FieldBasedIndexPatternColumn = Extract<IndexPatternColumn, { sourceField: string }>;

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
  lastValueOperation,
  countOperation,
  rangeOperation,
];

export { termsOperation } from './terms';
export { rangeOperation } from './ranges';
export { filtersOperation } from './filters';
export { dateHistogramOperation } from './date_histogram';
export { minOperation, averageOperation, sumOperation, maxOperation } from './metrics';
export { countOperation } from './count';
export { lastValueOperation } from './last_value';

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
   * Function turning a column into an agg config passed to the `esaggs` function
   * together with the agg configs returned from other columns.
   */
  toEsAggsConfig: (column: C, columnId: string, indexPattern: IndexPattern) => unknown;
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
   * if there is some reason to display the operation in the operations list
   * but disable it from usage, this function returns the string describing
   * the status. Otherwise it returns undefined
   */
  getDisabledStatus?: (indexPattern: IndexPattern) => string | undefined;
}

interface BaseBuildColumnArgs {
  columns: Partial<Record<string, IndexPatternColumn>>;
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
  getPossibleOperation: () => OperationMetadata | undefined;
}

interface FieldBasedOperationDefinition<C extends BaseIndexPatternColumn> {
  input: 'field';
  /**
   * Returns the meta data of the operation if applied to the given field. Undefined
   * if the field is not applicable to the operation.
   */
  getPossibleOperationForField: (field: IndexPatternField) => OperationMetadata | undefined;
  /**
   * Builds the column object for the given parameters. Should include default p
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
}

interface OperationDefinitionMap<C extends BaseIndexPatternColumn> {
  field: FieldBasedOperationDefinition<C>;
  none: FieldlessOperationDefinition<C>;
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
  | OperationDefinition<IndexPatternColumn, 'none'>;

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
