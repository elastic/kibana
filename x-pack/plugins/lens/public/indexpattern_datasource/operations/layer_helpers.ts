/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _, { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  operationDefinitionMap,
  operationDefinitions,
  OperationType,
  IndexPatternColumn,
  RequiredReference,
} from './definitions';
import type {
  IndexPattern,
  IndexPatternField,
  IndexPatternLayer,
  IndexPatternPrivateState,
} from '../types';
import { getSortScoreByPriority } from './operations';
import { mergeLayer } from '../state_helpers';
import { generateId } from '../../id_generator';

interface ColumnChange {
  op: OperationType;
  layer: IndexPatternLayer;
  columnId: string;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
}

export function insertOrReplaceColumn(args: ColumnChange): IndexPatternLayer {
  if (args.layer.columns[args.columnId]) {
    return replaceColumn(args);
  }
  return insertNewColumn(args);
}

// Insert a column into an empty ID. The field parameter is required when constructing
// a field-based operation, but will cause the function to fail for any other type of operation.
export function insertNewColumn({
  op,
  layer,
  columnId,
  field,
  indexPattern,
}: ColumnChange): IndexPatternLayer {
  const operationDefinition = operationDefinitionMap[op];

  if (!operationDefinition) {
    throw new Error('No suitable operation found for given parameters');
  }

  if (layer.columns[columnId]) {
    throw new Error(`Can't insert a column with an ID that is already in use`);
  }

  const baseOptions = { indexPattern, previousColumn: layer.columns[columnId] };

  if (operationDefinition.input === 'none') {
    if (field) {
      throw new Error(`Can't create operation ${op} with the provided field ${field.name}`);
    }
    const possibleOperation = operationDefinition.getPossibleOperation();
    const isBucketed = Boolean(possibleOperation.isBucketed);
    if (isBucketed) {
      return addBucket(layer, operationDefinition.buildColumn({ ...baseOptions, layer }), columnId);
    } else {
      return addMetric(layer, operationDefinition.buildColumn({ ...baseOptions, layer }), columnId);
    }
  }

  if (operationDefinition.input === 'fullReference') {
    if (field) {
      throw new Error(`Reference-based operations can't take a field as input when creating`);
    }
    let tempLayer = { ...layer };
    const referenceIds = operationDefinition.requiredReferences.map((validation) => {
      // TODO: This logic is too simple because it's not using fields. Once we have
      // access to the operationSupportMatrix, we should validate the metadata against
      // the possible fields
      const validOperations = Object.values(operationDefinitionMap).filter(({ type }) =>
        isOperationAllowedAsReference({ validation, operationType: type })
      );

      if (!validOperations.length) {
        throw new Error(
          `Can't create reference, ${op} has a validation function which doesn't allow any operations`
        );
      }

      const newId = generateId();
      if (validOperations.length === 1) {
        const def = validOperations[0];

        const validFields =
          def.input === 'field' ? indexPattern.fields.filter(def.getPossibleOperationForField) : [];

        if (def.input === 'none') {
          tempLayer = insertNewColumn({
            layer: tempLayer,
            columnId: newId,
            op: def.type,
            indexPattern,
          });
        } else if (validFields.length === 1) {
          // Recursively update the layer for each new reference
          tempLayer = insertNewColumn({
            layer: tempLayer,
            columnId: newId,
            op: def.type,
            indexPattern,
            field: validFields[0],
          });
        } else {
          tempLayer = {
            ...tempLayer,
            incompleteColumns: {
              ...tempLayer.incompleteColumns,
              [newId]: { operationType: def.type },
            },
          };
        }
      }
      return newId;
    });

    const possibleOperation = operationDefinition.getPossibleOperation();
    const isBucketed = Boolean(possibleOperation.isBucketed);
    if (isBucketed) {
      return addBucket(
        tempLayer,
        operationDefinition.buildColumn({
          ...baseOptions,
          layer: tempLayer,
          referenceIds,
        }),
        columnId
      );
    } else {
      return addMetric(
        tempLayer,
        operationDefinition.buildColumn({
          ...baseOptions,
          layer: tempLayer,
          referenceIds,
        }),
        columnId
      );
    }
  }

  if (!field) {
    throw new Error(`Invariant error: ${operationDefinition.type} operation requires field`);
  }

  const possibleOperation = operationDefinition.getPossibleOperationForField(field);
  if (!possibleOperation) {
    throw new Error(
      `Tried to create an invalid operation ${operationDefinition.type} on ${field.name}`
    );
  }
  const isBucketed = Boolean(possibleOperation.isBucketed);
  if (isBucketed) {
    return addBucket(
      layer,
      operationDefinition.buildColumn({ ...baseOptions, layer, field }),
      columnId
    );
  } else {
    return addMetric(
      layer,
      operationDefinition.buildColumn({ ...baseOptions, layer, field }),
      columnId
    );
  }
}

export function replaceColumn({
  layer,
  columnId,
  indexPattern,
  op,
  field,
}: ColumnChange): IndexPatternLayer {
  const previousColumn = layer.columns[columnId];
  if (!previousColumn) {
    throw new Error(`Can't replace column because there is no prior column`);
  }

  const isNewOperation = op !== previousColumn.operationType;
  const operationDefinition = operationDefinitionMap[op];
  const previousDefinition = operationDefinitionMap[previousColumn.operationType];

  if (!operationDefinition) {
    throw new Error('No suitable operation found for given parameters');
  }

  const baseOptions = {
    columns: layer.columns,
    indexPattern,
    previousColumn,
  };

  if (isNewOperation) {
    let tempLayer = { ...layer };

    if (previousDefinition.input === 'fullReference') {
      // @ts-expect-error references are not statically analyzed
      previousColumn.references.forEach((id: string) => {
        tempLayer = deleteColumn({ layer: tempLayer, columnId: id });
      });
    }

    if (operationDefinition.input === 'fullReference') {
      const referenceIds = operationDefinition.requiredReferences.map(() => generateId());

      const incompleteColumns = { ...(tempLayer.incompleteColumns || {}) };
      delete incompleteColumns[columnId];
      const newColumns = {
        ...tempLayer.columns,
        [columnId]: operationDefinition.buildColumn({
          ...baseOptions,
          layer: tempLayer,
          referenceIds,
          previousColumn,
        }),
      };
      return {
        ...tempLayer,
        columnOrder: getColumnOrder({ ...tempLayer, columns: newColumns }),
        columns: newColumns,
        incompleteColumns,
      };
    }

    if (operationDefinition.input === 'none') {
      const newColumn = operationDefinition.buildColumn({ ...baseOptions, layer: tempLayer });
      if (previousColumn.customLabel) {
        newColumn.customLabel = true;
        newColumn.label = previousColumn.label;
      }

      const newColumns = { ...tempLayer.columns, [columnId]: newColumn };
      return {
        ...tempLayer,
        columnOrder: getColumnOrder({ ...tempLayer, columns: newColumns }),
        columns: adjustColumnReferencesForChangedColumn(newColumns, columnId),
      };
    }

    if (!field) {
      throw new Error(`Invariant error: ${operationDefinition.type} operation requires field`);
    }

    const newColumn = operationDefinition.buildColumn({ ...baseOptions, layer: tempLayer, field });

    if (previousColumn.customLabel) {
      newColumn.customLabel = true;
      newColumn.label = previousColumn.label;
    }

    const newColumns = { ...tempLayer.columns, [columnId]: newColumn };
    return {
      ...tempLayer,
      columnOrder: getColumnOrder({ ...tempLayer, columns: newColumns }),
      columns: adjustColumnReferencesForChangedColumn(newColumns, columnId),
    };
  } else if (
    operationDefinition.input === 'field' &&
    field &&
    'sourceField' in previousColumn &&
    previousColumn.sourceField !== field.name
  ) {
    // Same operation, new field
    const newColumn = operationDefinition.onFieldChange(previousColumn, field);

    if (previousColumn.customLabel) {
      newColumn.customLabel = true;
      newColumn.label = previousColumn.label;
    }

    const newColumns = { ...layer.columns, [columnId]: newColumn };
    return {
      ...layer,
      columnOrder: getColumnOrder({ ...layer, columns: newColumns }),
      columns: adjustColumnReferencesForChangedColumn(newColumns, columnId),
    };
  } else {
    throw new Error('nothing changed');
  }
}

function addBucket(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  const [buckets, metrics] = separateBucketColumns(layer);

  const oldDateHistogramIndex = layer.columnOrder.findIndex(
    (columnId) => layer.columns[columnId].operationType === 'date_histogram'
  );

  let updatedColumnOrder: string[] = [];
  if (oldDateHistogramIndex > -1 && column.operationType === 'terms') {
    // Insert the new terms bucket above the first date histogram
    updatedColumnOrder = [
      ...buckets.slice(0, oldDateHistogramIndex),
      addedColumnId,
      ...buckets.slice(oldDateHistogramIndex, buckets.length),
      ...metrics,
    ];
  } else {
    // Insert the new bucket after existing buckets. Users will see the same data
    // they already had, with an extra level of detail.
    updatedColumnOrder = [...buckets, addedColumnId, ...metrics];
  }
  return {
    ...layer,
    columns: { ...layer.columns, [addedColumnId]: column },
    columnOrder: updatedColumnOrder,
  };
}

function addMetric(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [addedColumnId]: column,
    },
    columnOrder: [...layer.columnOrder, addedColumnId],
  };
}

function separateBucketColumns(layer: IndexPatternLayer) {
  return partition(layer.columnOrder, (columnId) => layer.columns[columnId]?.isBucketed);
}

export function getMetricOperationTypes(field: IndexPatternField) {
  return operationDefinitions.sort(getSortScoreByPriority).filter((definition) => {
    if (definition.input !== 'field') return;
    const metadata = definition.getPossibleOperationForField(field);
    return metadata && !metadata.isBucketed && metadata.dataType === 'number';
  });
}

export function updateColumnParam<C extends IndexPatternColumn>({
  state,
  layerId,
  currentColumn,
  paramName,
  value,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  currentColumn: C;
  paramName: string;
  value: unknown;
}): IndexPatternPrivateState {
  const columnId = Object.entries(state.layers[layerId].columns).find(
    ([_columnId, column]) => column === currentColumn
  )![0];

  const layer = state.layers[layerId];

  return mergeLayer({
    state,
    layerId,
    newLayer: {
      columns: {
        ...layer.columns,
        [columnId]: {
          ...currentColumn,
          params: {
            ...currentColumn.params,
            [paramName]: value,
          },
        },
      },
    },
  });
}

function adjustColumnReferencesForChangedColumn(
  columns: Record<string, IndexPatternColumn>,
  columnId: string
) {
  const newColumns = { ...columns };
  Object.keys(newColumns).forEach((currentColumnId) => {
    if (currentColumnId !== columnId) {
      const currentColumn = newColumns[currentColumnId];
      const operationDefinition = operationDefinitionMap[currentColumn.operationType];
      newColumns[currentColumnId] = operationDefinition.onOtherColumnChanged
        ? operationDefinition.onOtherColumnChanged(currentColumn, newColumns)
        : currentColumn;
    }
  });
  return newColumns;
}

export function deleteColumn({
  layer,
  columnId,
}: {
  layer: IndexPatternLayer;
  columnId: string;
}): IndexPatternLayer {
  const column = layer.columns[columnId];
  if (!column) {
    const newIncomplete = { ...(layer.incompleteColumns || {}) };
    delete newIncomplete[columnId];
    return {
      ...layer,
      columnOrder: layer.columnOrder.filter((id) => id !== columnId),
      incompleteColumns: newIncomplete,
    };
  }

  const extraDeletions: string[] = 'references' in column ? column.references : [];

  const hypotheticalColumns = { ...layer.columns };
  delete hypotheticalColumns[columnId];

  let newLayer = {
    ...layer,
    columns: adjustColumnReferencesForChangedColumn(hypotheticalColumns, columnId),
  };

  extraDeletions.forEach((id) => {
    newLayer = deleteColumn({ layer: newLayer, columnId: id });
  });

  const newIncomplete = { ...(newLayer.incompleteColumns || {}) };
  delete newIncomplete[columnId];

  return { ...newLayer, columnOrder: getColumnOrder(newLayer), incompleteColumns: newIncomplete };
}

export function getColumnOrder(layer: IndexPatternLayer): string[] {
  const [direct, referenceBased] = _.partition(
    Object.entries(layer.columns),
    ([id, col]) => operationDefinitionMap[col.operationType].input !== 'fullReference'
  );
  // If a reference has another reference as input, put it last in sort order
  referenceBased.sort(([idA, a], [idB, b]) => {
    if ('references' in a && a.references.includes(idB)) {
      return 1;
    }
    if ('references' in b && b.references.includes(idA)) {
      return -1;
    }
    return 0;
  });
  const [aggregations, metrics] = _.partition(direct, ([, col]) => col.isBucketed);

  return aggregations
    .map(([id]) => id)
    .concat(metrics.map(([id]) => id))
    .concat(referenceBased.map(([id]) => id));
}

/**
 * Returns true if the given column can be applied to the given index pattern
 */
export function isColumnTransferable(column: IndexPatternColumn, newIndexPattern: IndexPattern) {
  return operationDefinitionMap[column.operationType].isTransferable(column, newIndexPattern);
}

export function updateLayerIndexPattern(
  layer: IndexPatternLayer,
  newIndexPattern: IndexPattern
): IndexPatternLayer {
  const keptColumns: IndexPatternLayer['columns'] = _.pickBy(layer.columns, (column) =>
    isColumnTransferable(column, newIndexPattern)
  );
  const newColumns: IndexPatternLayer['columns'] = _.mapValues(keptColumns, (column) => {
    const operationDefinition = operationDefinitionMap[column.operationType];
    return operationDefinition.transfer
      ? operationDefinition.transfer(column, newIndexPattern)
      : column;
  });
  const newColumnOrder = layer.columnOrder.filter((columnId) => newColumns[columnId]);

  return {
    ...layer,
    indexPatternId: newIndexPattern.id,
    columns: newColumns,
    columnOrder: newColumnOrder,
  };
}

/**
 * Collects all errors from the columns in the layer, for display in the workspace. This includes:
 *
 * - All columns have complete references
 * - All column references are valid
 * - All prerequisites are met
 */
export function getErrorMessages(layer: IndexPatternLayer): string[] | undefined {
  const errors: string[] = [];

  Object.entries(layer.columns).forEach(([columnId, column]) => {
    const def = operationDefinitionMap[column.operationType];
    if (def.input === 'fullReference' && def.getErrorMessage) {
      errors.push(...(def.getErrorMessage(layer, columnId) ?? []));
    }

    if ('references' in column) {
      column.references.forEach((referenceId, index) => {
        if (!layer.columns[referenceId]) {
          errors.push(
            i18n.translate('xpack.lens.indexPattern.missingReferenceError', {
              defaultMessage: 'Dimension {dimensionLabel} is incomplete',
              values: {
                dimensionLabel: column.label,
              },
            })
          );
        } else {
          const referenceColumn = layer.columns[referenceId]!;
          const requirements =
            // @ts-expect-error not statically analyzed
            operationDefinitionMap[column.operationType].requiredReferences[index];
          const isValid = isColumnValidAsReference({
            validation: requirements,
            column: referenceColumn,
          });

          if (!isValid) {
            errors.push(
              i18n.translate('xpack.lens.indexPattern.invalidReferenceConfiguration', {
                defaultMessage: 'Dimension {dimensionLabel} does not have a valid configuration',
                values: {
                  dimensionLabel: column.label,
                },
              })
            );
          }
        }
      });
    }
  });

  return errors.length ? errors : undefined;
}

export function isReferenced(layer: IndexPatternLayer, columnId: string): boolean {
  const allReferences = Object.values(layer.columns).flatMap((col) =>
    'references' in col ? col.references : []
  );
  return allReferences.includes(columnId);
}

function isColumnValidAsReference({
  column,
  validation,
}: {
  column: IndexPatternColumn;
  validation: RequiredReference;
}): boolean {
  if (!column) return false;
  const operationType = column.operationType;
  const operationDefinition = operationDefinitionMap[operationType];
  return (
    validation.input.includes(operationDefinition.input) &&
    (!validation.specificOperations || validation.specificOperations.includes(operationType)) &&
    validation.validateMetadata(column)
  );
}

function isOperationAllowedAsReference({
  operationType,
  validation,
  field,
}: {
  operationType: OperationType;
  validation: RequiredReference;
  field?: IndexPatternField;
}): boolean {
  const operationDefinition = operationDefinitionMap[operationType];

  let hasValidMetadata = true;
  if (field && operationDefinition.input === 'field') {
    const metadata = operationDefinition.getPossibleOperationForField(field);
    hasValidMetadata = Boolean(metadata) && validation.validateMetadata(metadata!);
  } else if (operationDefinition.input !== 'field') {
    const metadata = operationDefinition.getPossibleOperation();
    hasValidMetadata = Boolean(metadata) && validation.validateMetadata(metadata!);
  } else {
    // TODO: How can we validate the metadata without a specific field?
  }
  return (
    validation.input.includes(operationDefinition.input) &&
    (!validation.specificOperations || validation.specificOperations.includes(operationType)) &&
    hasValidMetadata
  );
}
