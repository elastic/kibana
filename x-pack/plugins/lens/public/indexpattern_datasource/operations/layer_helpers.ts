/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _, { partition } from 'lodash';
import type { OperationMetadata } from '../../types';
import {
  operationDefinitionMap,
  operationDefinitions,
  OperationType,
  IndexPatternColumn,
  RequiredReference,
} from './definitions';
import type { IndexPattern, IndexPatternField, IndexPatternLayer } from '../types';
import { getSortScoreByPriority } from './operations';
import { generateId } from '../../id_generator';
import { ReferenceBasedIndexPatternColumn } from './definitions/column_types';

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
    const addOperationFn = isBucketed ? addBucket : addMetric;
    return updateDefaultLabels(
      addOperationFn(layer, operationDefinition.buildColumn({ ...baseOptions, layer }), columnId),
      indexPattern
    );
  }

  if (operationDefinition.input === 'fullReference') {
    if (field) {
      throw new Error(`Reference-based operations can't take a field as input when creating`);
    }
    let tempLayer = { ...layer };
    const referenceIds = operationDefinition.requiredReferences.map((validation) => {
      const validOperations = Object.values(operationDefinitionMap).filter(({ type }) =>
        isOperationAllowedAsReference({ validation, operationType: type, indexPattern })
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

    const possibleOperation = operationDefinition.getPossibleOperation(indexPattern);
    if (!possibleOperation) {
      throw new Error(
        `Can't create operation ${op} because it's incompatible with the index pattern`
      );
    }
    const isBucketed = Boolean(possibleOperation.isBucketed);

    const addOperationFn = isBucketed ? addBucket : addMetric;
    return updateDefaultLabels(
      addOperationFn(
        tempLayer,
        operationDefinition.buildColumn({ ...baseOptions, layer: tempLayer, referenceIds }),
        columnId
      ),
      indexPattern
    );
  }

  const invalidFieldName = (layer.incompleteColumns ?? {})[columnId]?.sourceField;
  const invalidField = invalidFieldName ? indexPattern.getFieldByName(invalidFieldName) : undefined;

  if (!field && invalidField) {
    const possibleOperation = operationDefinition.getPossibleOperationForField(invalidField);
    if (!possibleOperation) {
      throw new Error(
        `Tried to create an invalid operation ${operationDefinition.type} using previously selected field ${invalidField.name}`
      );
    }
    const isBucketed = Boolean(possibleOperation.isBucketed);
    if (isBucketed) {
      return updateDefaultLabels(
        addBucket(
          layer,
          operationDefinition.buildColumn({ ...baseOptions, layer, field: invalidField }),
          columnId
        ),
        indexPattern
      );
    } else {
      return updateDefaultLabels(
        addMetric(
          layer,
          operationDefinition.buildColumn({ ...baseOptions, layer, field: invalidField }),
          columnId
        ),
        indexPattern
      );
    }
  } else if (!field) {
    // Labels don't need to be updated because it's incomplete
    return {
      ...layer,
      incompleteColumns: {
        ...(layer.incompleteColumns ?? {}),
        [columnId]: { operationType: op },
      },
    };
  }

  const possibleOperation = operationDefinition.getPossibleOperationForField(field);
  if (!possibleOperation) {
    return {
      ...layer,
      incompleteColumns: {
        ...(layer.incompleteColumns ?? {}),
        [columnId]: { operationType: op, sourceField: field.name },
      },
    };
  }
  const isBucketed = Boolean(possibleOperation.isBucketed);
  const addOperationFn = isBucketed ? addBucket : addMetric;
  return updateDefaultLabels(
    addOperationFn(
      layer,
      operationDefinition.buildColumn({ ...baseOptions, layer, field }),
      columnId
    ),
    indexPattern
  );
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

    tempLayer = resetIncomplete(tempLayer, columnId);

    if (operationDefinition.input === 'fullReference') {
      return applyReferenceTransition({
        layer: tempLayer,
        columnId,
        previousColumn,
        op,
        indexPattern,
      });
    }

    // Makes common inferences about what the user meant when switching away from a reference:
    // 1. Switching from "Differences of max" to "max" will promote as-is
    // 2. Switching from "Differences of avg of bytes" to "max" will keep the field, but change operation
    if (
      previousDefinition.input === 'fullReference' &&
      (previousColumn as ReferenceBasedIndexPatternColumn).references.length === 1
    ) {
      const previousReferenceId = (previousColumn as ReferenceBasedIndexPatternColumn)
        .references[0];
      const referenceColumn = layer.columns[previousReferenceId];
      if (referenceColumn) {
        const referencedOperation = operationDefinitionMap[referenceColumn.operationType];

        if (referencedOperation.type === op) {
          // Unit tests are labelled as case a1, case a2
          tempLayer = deleteColumn({
            layer: tempLayer,
            columnId: previousReferenceId,
            indexPattern,
          });

          tempLayer = {
            ...tempLayer,
            columns: {
              ...tempLayer.columns,
              [columnId]: copyCustomLabel({ ...referenceColumn }, previousColumn),
            },
          };
          return updateDefaultLabels(
            {
              ...tempLayer,
              columnOrder: getColumnOrder(tempLayer),
              columns: adjustColumnReferencesForChangedColumn(tempLayer, columnId),
            },
            indexPattern
          );
        } else if (
          !field &&
          'sourceField' in referenceColumn &&
          referencedOperation.input === 'field' &&
          operationDefinition.input === 'field'
        ) {
          // Unit test is case a3
          const matchedField = indexPattern.getFieldByName(referenceColumn.sourceField);
          if (matchedField && operationDefinition.getPossibleOperationForField(matchedField)) {
            field = matchedField;
          }
        }
      }
    }

    // This logic comes after the transitions because they need to look at previous columns
    if (previousDefinition.input === 'fullReference') {
      (previousColumn as ReferenceBasedIndexPatternColumn).references.forEach((id: string) => {
        tempLayer = deleteColumn({ layer: tempLayer, columnId: id, indexPattern });
      });
    }

    if (operationDefinition.input === 'none') {
      let newColumn = operationDefinition.buildColumn({ ...baseOptions, layer: tempLayer });
      newColumn = copyCustomLabel(newColumn, previousColumn);

      const newLayer = { ...tempLayer, columns: { ...tempLayer.columns, [columnId]: newColumn } };
      return updateDefaultLabels(
        {
          ...tempLayer,
          columnOrder: getColumnOrder(newLayer),
          columns: adjustColumnReferencesForChangedColumn(newLayer, columnId),
        },
        indexPattern
      );
    }

    if (!field) {
      return {
        ...tempLayer,
        incompleteColumns: {
          ...(tempLayer.incompleteColumns ?? {}),
          [columnId]: { operationType: op },
        },
      };
    }

    const validOperation = operationDefinition.getPossibleOperationForField(field);
    if (!validOperation) {
      return {
        ...tempLayer,
        incompleteColumns: {
          ...(tempLayer.incompleteColumns ?? {}),
          [columnId]: { operationType: op },
        },
      };
    }
    let newColumn = operationDefinition.buildColumn({ ...baseOptions, layer: tempLayer, field });
    newColumn = copyCustomLabel(newColumn, previousColumn);

    const newLayer = { ...tempLayer, columns: { ...tempLayer.columns, [columnId]: newColumn } };
    return updateDefaultLabels(
      {
        ...tempLayer,
        columnOrder: getColumnOrder(newLayer),
        columns: adjustColumnReferencesForChangedColumn(newLayer, columnId),
      },
      indexPattern
    );
  } else if (
    operationDefinition.input === 'field' &&
    field &&
    'sourceField' in previousColumn &&
    previousColumn.sourceField !== field.name
  ) {
    // Same operation, new field
    const newColumn = copyCustomLabel(
      operationDefinition.onFieldChange(previousColumn, field),
      previousColumn
    );

    const newLayer = resetIncomplete(
      { ...layer, columns: { ...layer.columns, [columnId]: newColumn } },
      columnId
    );
    return {
      ...newLayer,
      columnOrder: getColumnOrder(newLayer),
      columns: adjustColumnReferencesForChangedColumn(newLayer, columnId),
    };
  } else {
    throw new Error('nothing changed');
  }
}

export function canTransition({
  layer,
  columnId,
  op,
  field,
  indexPattern,
  filterOperations,
}: ColumnChange & {
  filterOperations: (meta: OperationMetadata) => boolean;
}): boolean {
  const previousColumn = layer.columns[columnId];
  if (!previousColumn) {
    return true;
  }

  if (previousColumn.operationType === op) {
    return true;
  }

  try {
    const newLayer = replaceColumn({ layer, columnId, op, field, indexPattern });
    const newDefinition = operationDefinitionMap[op];
    const newColumn = newLayer.columns[columnId];
    return (
      Boolean(newColumn) &&
      !newLayer.incompleteColumns?.[columnId] &&
      filterOperations(newColumn) &&
      !newDefinition.getErrorMessage?.(newLayer, columnId, indexPattern)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Function to transition to a fullReference from any different operation.
 * It is always possible to transition to a fullReference, but there are multiple
 * passes needed to copy all the previous state. These are the passes in priority
 * order, each of which has a unit test:
 *
 * 1. Case ref1: referenced columns are an exact match
 *    Side effect: Modifies the reference list directly
 * 2. Case new1: the previous column is an exact match.
 *    Side effect: Deletes and then inserts the previous column
 * 3. Case new2: the reference supports `none` inputs, like filters. not visible in the UI.
 *    Side effect: Inserts a new column
 * 4. Case new3, new4: Fuzzy matching on the previous field
 *    Side effect: Inserts a new column, or an incomplete column
 * 5. Fuzzy matching based on the previous references (case new6)
 *    Side effect: Inserts a new column, or an incomplete column
 *    Side effect: Modifies the reference list directly
 * 6. Case new6: Fall back by generating the column with empty references
 */
function applyReferenceTransition({
  layer,
  columnId,
  previousColumn,
  op,
  indexPattern,
}: {
  layer: IndexPatternLayer;
  columnId: string;
  previousColumn: IndexPatternColumn;
  op: OperationType;
  indexPattern: IndexPattern;
}): IndexPatternLayer {
  const operationDefinition = operationDefinitionMap[op];

  if (operationDefinition.input !== 'fullReference') {
    throw new Error(`Requirements for transitioning are not met`);
  }

  let hasExactMatch = false;
  let hasFieldMatch = false;

  const unusedReferencesQueue =
    'references' in previousColumn
      ? [...(previousColumn as ReferenceBasedIndexPatternColumn).references]
      : [];

  const referenceIds = operationDefinition.requiredReferences.map((validation) => {
    const newId = generateId();

    // First priority is to use any references that can be kept (case ref1)
    if (unusedReferencesQueue.length) {
      const otherColumn = layer.columns[unusedReferencesQueue[0]];
      if (isColumnValidAsReference({ validation, column: otherColumn })) {
        return unusedReferencesQueue.shift()!;
      }
    }

    // Second priority is to wrap around the previous column (case new1)
    if (!hasExactMatch && isColumnValidAsReference({ validation, column: previousColumn })) {
      hasExactMatch = true;

      const newLayer = { ...layer, columns: { ...layer.columns, [newId]: { ...previousColumn } } };
      layer = {
        ...layer,
        columnOrder: getColumnOrder(newLayer),
        columns: adjustColumnReferencesForChangedColumn(newLayer, newId),
      };
      return newId;
    }

    // Look for any fieldless operations that can be inserted directly (case new2)
    if (validation.input.includes('none')) {
      const validOperations = operationDefinitions.filter((def) => {
        if (def.input !== 'none') return;
        return isOperationAllowedAsReference({
          validation,
          operationType: def.type,
          indexPattern,
        });
      });

      if (validOperations.length === 1) {
        layer = insertNewColumn({
          layer,
          columnId: newId,
          op: validOperations[0].type,
          indexPattern,
        });
        return newId;
      }
    }

    // Try to reuse the previous field by finding a possible operation. Because we've alredy
    // checked for an exact operation match, this is guaranteed to be different from previousColumn
    if (!hasFieldMatch && 'sourceField' in previousColumn && validation.input.includes('field')) {
      const defIgnoringfield = operationDefinitions
        .filter(
          (def) =>
            def.input === 'field' &&
            isOperationAllowedAsReference({ validation, operationType: def.type, indexPattern })
        )
        .sort(getSortScoreByPriority);

      // No exact match found, so let's determine that the current field can be reused
      const defWithField = defIgnoringfield.filter((def) => {
        const previousField = indexPattern.getFieldByName(previousColumn.sourceField);
        if (!previousField) return;
        return isOperationAllowedAsReference({
          validation,
          operationType: def.type,
          field: previousField,
          indexPattern,
        });
      });

      if (defWithField.length > 0) {
        // Found the best match that keeps the field (case new3)
        hasFieldMatch = true;
        layer = insertNewColumn({
          layer,
          columnId: newId,
          op: defWithField[0].type,
          indexPattern,
          field: indexPattern.getFieldByName(previousColumn.sourceField),
        });
        return newId;
      } else if (defIgnoringfield.length === 1) {
        // Can't use the field, but there is an exact match on the operation (case new4)
        hasFieldMatch = true;
        layer = {
          ...layer,
          incompleteColumns: {
            ...layer.incompleteColumns,
            [newId]: { operationType: defIgnoringfield[0].type },
          },
        };
        return newId;
      }
    }

    // Look for field-based references that we can use to assign a new field-based operation from (case new5)
    if (unusedReferencesQueue.length) {
      const otherColumn = layer.columns[unusedReferencesQueue[0]];
      if (otherColumn && 'sourceField' in otherColumn && validation.input.includes('field')) {
        const previousField = indexPattern.getFieldByName(otherColumn.sourceField);
        if (previousField) {
          const defWithField = operationDefinitions
            .filter(
              (def) =>
                def.input === 'field' &&
                isOperationAllowedAsReference({
                  validation,
                  operationType: def.type,
                  field: previousField,
                  indexPattern,
                })
            )
            .sort(getSortScoreByPriority);

          if (defWithField.length > 0) {
            layer = insertNewColumn({
              layer,
              columnId: newId,
              op: defWithField[0].type,
              indexPattern,
              field: previousField,
            });
            return newId;
          }
        }
      }
    }

    // The reference is too ambiguous at this point, but instead of throwing an error (case new6)
    return newId;
  });

  if (unusedReferencesQueue.length) {
    unusedReferencesQueue.forEach((id: string) => {
      layer = deleteColumn({
        layer,
        columnId: id,
        indexPattern,
      });
    });
  }

  layer = {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: operationDefinition.buildColumn({
        indexPattern,
        layer,
        referenceIds,
        previousColumn,
      }),
    },
  };
  return updateDefaultLabels(
    {
      ...layer,
      columnOrder: getColumnOrder(layer),
      columns: adjustColumnReferencesForChangedColumn(layer, columnId),
    },
    indexPattern
  );
}

function copyCustomLabel(newColumn: IndexPatternColumn, previousColumn: IndexPatternColumn) {
  const adjustedColumn = { ...newColumn };
  if (previousColumn.customLabel) {
    adjustedColumn.customLabel = true;
    adjustedColumn.label = previousColumn.label;
  }
  return adjustedColumn;
}

function addBucket(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  const [buckets, metrics, references] = getExistingColumnGroups(layer);

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
      ...references,
    ];
  } else {
    // Insert the new bucket after existing buckets. Users will see the same data
    // they already had, with an extra level of detail.
    updatedColumnOrder = [...buckets, addedColumnId, ...metrics, ...references];
  }
  const tempLayer = {
    ...resetIncomplete(layer, addedColumnId),
    columns: { ...layer.columns, [addedColumnId]: column },
    columnOrder: updatedColumnOrder,
  };
  return { ...tempLayer, columnOrder: getColumnOrder(tempLayer) };
}

function addMetric(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string
): IndexPatternLayer {
  const tempLayer = {
    ...resetIncomplete(layer, addedColumnId),
    columns: {
      ...layer.columns,
      [addedColumnId]: column,
    },
  };
  return { ...tempLayer, columnOrder: getColumnOrder(tempLayer) };
}

export function getMetricOperationTypes(field: IndexPatternField) {
  return operationDefinitions.sort(getSortScoreByPriority).filter((definition) => {
    if (definition.input !== 'field') return;
    const metadata = definition.getPossibleOperationForField(field);
    return metadata && !metadata.isBucketed && metadata.dataType === 'number';
  });
}

export function updateColumnParam<C extends IndexPatternColumn>({
  layer,
  columnId,
  paramName,
  value,
}: {
  layer: IndexPatternLayer;
  columnId: string;
  paramName: string;
  value: unknown;
}): IndexPatternLayer {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        params: {
          ...layer.columns[columnId].params,
          [paramName]: value,
        },
      },
    } as Record<string, IndexPatternColumn>,
  };
}

function adjustColumnReferencesForChangedColumn(layer: IndexPatternLayer, changedColumnId: string) {
  const newColumns = { ...layer.columns };
  Object.keys(newColumns).forEach((currentColumnId) => {
    if (currentColumnId !== changedColumnId) {
      const currentColumn = newColumns[currentColumnId];
      const operationDefinition = operationDefinitionMap[currentColumn.operationType];
      newColumns[currentColumnId] = operationDefinition.onOtherColumnChanged
        ? operationDefinition.onOtherColumnChanged(
            { ...layer, columns: newColumns },
            currentColumnId,
            changedColumnId
          )
        : currentColumn;
    }
  });
  return newColumns;
}

export function deleteColumn({
  layer,
  columnId,
  indexPattern,
}: {
  layer: IndexPatternLayer;
  columnId: string;
  indexPattern: IndexPattern;
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
    columns: adjustColumnReferencesForChangedColumn(
      { ...layer, columns: hypotheticalColumns },
      columnId
    ),
  };

  extraDeletions.forEach((id) => {
    newLayer = deleteColumn({ layer: newLayer, columnId: id, indexPattern });
  });

  const newIncomplete = { ...(newLayer.incompleteColumns || {}) };
  delete newIncomplete[columnId];

  return updateDefaultLabels(
    {
      ...newLayer,
      columnOrder: getColumnOrder(newLayer),
      incompleteColumns: newIncomplete,
    },
    indexPattern
  );
}

// Derives column order from column object, respects existing columnOrder
// when possible, but also allows new columns to be added to the order
export function getColumnOrder(layer: IndexPatternLayer): string[] {
  const entries = Object.entries(layer.columns);
  entries.sort(([idA], [idB]) => {
    const indexA = layer.columnOrder.indexOf(idA);
    const indexB = layer.columnOrder.indexOf(idB);
    if (indexA > -1 && indexB > -1) {
      return indexA - indexB;
    } else if (indexA > -1) {
      return -1;
    } else {
      return 1;
    }
  });

  const [direct, referenceBased] = _.partition(
    entries,
    ([, col]) => operationDefinitionMap[col.operationType].input !== 'fullReference'
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

// Splits existing columnOrder into the three categories
export function getExistingColumnGroups(layer: IndexPatternLayer): [string[], string[], string[]] {
  const [direct, referenced] = partition(
    layer.columnOrder,
    (columnId) => layer.columns[columnId] && !('references' in layer.columns[columnId])
  );
  return [...partition(direct, (columnId) => layer.columns[columnId]?.isBucketed), referenced];
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
    if (def.getErrorMessage) {
      errors.push(...(def.getErrorMessage(layer, columnId) ?? []));
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

export function isOperationAllowedAsReference({
  operationType,
  validation,
  field,
  indexPattern,
}: {
  operationType: OperationType;
  validation: RequiredReference;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
}): boolean {
  const operationDefinition = operationDefinitionMap[operationType];

  let hasValidMetadata = true;
  if (field && operationDefinition.input === 'field') {
    const metadata = operationDefinition.getPossibleOperationForField(field);
    hasValidMetadata = Boolean(metadata) && validation.validateMetadata(metadata!);
  } else if (operationDefinition.input === 'none') {
    const metadata = operationDefinition.getPossibleOperation();
    hasValidMetadata = Boolean(metadata) && validation.validateMetadata(metadata!);
  } else if (operationDefinition.input === 'fullReference') {
    const metadata = operationDefinition.getPossibleOperation(indexPattern);
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

// Labels need to be updated when columns are added because reference-based column labels
// are sometimes copied into the parents
function updateDefaultLabels(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern
): IndexPatternLayer {
  const copiedColumns = { ...layer.columns };
  layer.columnOrder.forEach((id) => {
    const col = copiedColumns[id];
    if (!col.customLabel) {
      copiedColumns[id] = {
        ...col,
        label: operationDefinitionMap[col.operationType].getDefaultLabel(
          col,
          indexPattern,
          copiedColumns
        ),
      };
    }
  });
  return { ...layer, columns: copiedColumns };
}

export function resetIncomplete(layer: IndexPatternLayer, columnId: string): IndexPatternLayer {
  const incompleteColumns = { ...(layer.incompleteColumns ?? {}) };
  delete incompleteColumns[columnId];
  return { ...layer, incompleteColumns };
}

export function isColumnValidAsReference({
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
