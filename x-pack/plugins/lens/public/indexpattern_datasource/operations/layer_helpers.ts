/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, mapValues, pickBy } from 'lodash';
import { CoreStart } from 'kibana/public';
import type {
  FramePublicAPI,
  OperationMetadata,
  VisualizationDimensionGroupConfig,
} from '../../types';
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
import { generateId } from '../../id_generator';
import { ReferenceBasedIndexPatternColumn } from './definitions/column_types';
import { FormulaIndexPatternColumn, regenerateLayerFromAst } from './definitions/formula';

interface ColumnChange {
  op: OperationType;
  layer: IndexPatternLayer;
  columnId: string;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
  visualizationGroups: VisualizationDimensionGroupConfig[];
  targetGroup?: string;
  shouldResetLabel?: boolean;
}

interface ColumnCopy {
  layer: IndexPatternLayer;
  targetId: string;
  sourceColumn: IndexPatternColumn;
  sourceColumnId: string;
  indexPattern: IndexPattern;
  shouldDeleteSource?: boolean;
}

export function copyColumn({
  layer,
  targetId,
  sourceColumn,
  shouldDeleteSource,
  indexPattern,
  sourceColumnId,
}: ColumnCopy): IndexPatternLayer {
  let modifiedLayer = copyReferencesRecursively(
    layer,
    sourceColumn,
    sourceColumnId,
    targetId,
    indexPattern
  );

  if (shouldDeleteSource) {
    modifiedLayer = deleteColumn({
      layer: modifiedLayer,
      columnId: sourceColumnId,
      indexPattern,
    });
  }

  return modifiedLayer;
}

function copyReferencesRecursively(
  layer: IndexPatternLayer,
  sourceColumn: IndexPatternColumn,
  sourceId: string,
  targetId: string,
  indexPattern: IndexPattern
): IndexPatternLayer {
  let columns = { ...layer.columns };
  if ('references' in sourceColumn) {
    if (columns[targetId]) {
      return layer;
    }

    const def = operationDefinitionMap[sourceColumn.operationType];
    if ('createCopy' in def) {
      // Allow managed references to recursively insert new columns
      return def.createCopy(layer, sourceId, targetId, indexPattern, operationDefinitionMap);
    }

    sourceColumn?.references.forEach((ref, index) => {
      const newId = generateId();
      const refColumn = { ...columns[ref] };

      // TODO: For fullReference types, now all references are hidden columns,
      // but in the future we will have references to visible columns
      // and visible columns shouldn't be copied
      const refColumnWithInnerRefs =
        'references' in refColumn
          ? copyReferencesRecursively(layer, refColumn, sourceId, newId, indexPattern).columns // if a column has references, copy them too
          : { [newId]: refColumn };

      const newColumn = columns[targetId];
      let references = [newId];
      if (newColumn && 'references' in newColumn) {
        references = newColumn.references;
        references[index] = newId;
      }

      columns = {
        ...columns,
        ...refColumnWithInnerRefs,
        [targetId]: {
          ...sourceColumn,
          references,
        },
      };
    });
  } else {
    columns = {
      ...columns,
      [targetId]: sourceColumn,
    };
  }

  return { ...layer, columns, columnOrder: getColumnOrder({ ...layer, columns }) };
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
  visualizationGroups,
  targetGroup,
  shouldResetLabel,
}: ColumnChange): IndexPatternLayer {
  const operationDefinition = operationDefinitionMap[op];

  if (!operationDefinition) {
    throw new Error('No suitable operation found for given parameters');
  }

  if (layer.columns[columnId]) {
    throw new Error(`Can't insert a column with an ID that is already in use`);
  }

  const baseOptions = { indexPattern, previousColumn: layer.columns[columnId] };

  if (operationDefinition.input === 'none' || operationDefinition.input === 'managedReference') {
    if (field) {
      throw new Error(`Can't create operation ${op} with the provided field ${field.name}`);
    }
    if (operationDefinition.input === 'managedReference') {
      // TODO: need to create on the fly the new columns for Formula,
      // like we do for fullReferences to show a seamless transition
    }
    const possibleOperation = operationDefinition.getPossibleOperation();
    const isBucketed = Boolean(possibleOperation?.isBucketed);
    const addOperationFn = isBucketed ? addBucket : addMetric;
    return updateDefaultLabels(
      addOperationFn(
        layer,
        operationDefinition.buildColumn({ ...baseOptions, layer }),
        columnId,
        visualizationGroups,
        targetGroup
      ),
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
            visualizationGroups,
            targetGroup,
          });
        } else if (validFields.length === 1) {
          // Recursively update the layer for each new reference
          tempLayer = insertNewColumn({
            layer: tempLayer,
            columnId: newId,
            op: def.type,
            indexPattern,
            field: validFields[0],
            visualizationGroups,
            targetGroup,
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
        columnId,
        visualizationGroups,
        targetGroup
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
          columnId,
          visualizationGroups,
          targetGroup
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

  const newColumn = operationDefinition.buildColumn({ ...baseOptions, layer, field });
  const isBucketed = Boolean(possibleOperation.isBucketed);
  const addOperationFn = isBucketed ? addBucket : addMetric;
  return updateDefaultLabels(
    addOperationFn(layer, newColumn, columnId, visualizationGroups, targetGroup),
    indexPattern
  );
}

export function replaceColumn({
  layer,
  columnId,
  indexPattern,
  op,
  field,
  visualizationGroups,
  shouldResetLabel,
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

    if (previousDefinition.input === 'managedReference') {
      // If the transition is incomplete, leave the managed state until it's finished.
      tempLayer = deleteColumn({ layer: tempLayer, columnId, indexPattern });
      const hypotheticalLayer = insertNewColumn({
        layer: tempLayer,
        columnId,
        indexPattern,
        op,
        field,
        visualizationGroups,
      });
      if (hypotheticalLayer.incompleteColumns && hypotheticalLayer.incompleteColumns[columnId]) {
        return {
          ...layer,
          incompleteColumns: hypotheticalLayer.incompleteColumns,
        };
      } else {
        return hypotheticalLayer;
      }
    }

    if (operationDefinition.input === 'fullReference') {
      return applyReferenceTransition({
        layer: tempLayer,
        columnId,
        previousColumn,
        op,
        indexPattern,
        visualizationGroups,
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

          const column = copyCustomLabel({ ...referenceColumn }, previousColumn);
          // do not forget to move over also any filter/shift/anything (if compatible)
          // from the reference definition to the new operation.
          if (referencedOperation.filterable) {
            column.filter = (previousColumn as ReferenceBasedIndexPatternColumn).filter;
          }
          if (referencedOperation.shiftable) {
            column.timeShift = (previousColumn as ReferenceBasedIndexPatternColumn).timeShift;
          }

          tempLayer = {
            ...tempLayer,
            columns: {
              ...tempLayer.columns,
              [columnId]: column,
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

    // TODO: Refactor all this to be more generic and know less about Formula
    // if managed it has to look at the full picture to have a seamless transition
    if (operationDefinition.input === 'managedReference') {
      const newColumn = copyCustomLabel(
        operationDefinition.buildColumn(
          { ...baseOptions, layer: tempLayer },
          previousColumn.params,
          operationDefinitionMap
        ),
        previousColumn
      ) as FormulaIndexPatternColumn;

      // now remove the previous references
      if (previousDefinition.input === 'fullReference') {
        (previousColumn as ReferenceBasedIndexPatternColumn).references.forEach((id: string) => {
          tempLayer = deleteColumn({ layer: tempLayer, columnId: id, indexPattern });
        });
      }

      const basicLayer = { ...tempLayer, columns: { ...tempLayer.columns, [columnId]: newColumn } };
      // rebuild the references again for the specific AST generated
      let newLayer;

      try {
        newLayer = newColumn.params.formula
          ? regenerateLayerFromAst(
              newColumn.params.formula,
              basicLayer,
              columnId,
              newColumn,
              indexPattern,
              operationDefinitionMap
            ).newLayer
          : basicLayer;
      } catch (e) {
        newLayer = basicLayer;
      }

      return updateDefaultLabels(
        {
          ...tempLayer,
          columnOrder: getColumnOrder(newLayer),
          columns: adjustColumnReferencesForChangedColumn(newLayer, columnId),
        },
        indexPattern
      );
    }

    // This logic comes after the transitions because they need to look at previous columns
    if (previousDefinition.input === 'fullReference') {
      (previousColumn as ReferenceBasedIndexPatternColumn).references.forEach((id: string) => {
        tempLayer = deleteColumn({
          layer: tempLayer,
          columnId: id,
          indexPattern,
        });
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
      // if no field is available perform a full clean of the column from the layer
      if (previousDefinition.input === 'fullReference') {
        tempLayer = deleteColumn({ layer: tempLayer, columnId, indexPattern });
      }
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
    if (!shouldResetLabel) {
      newColumn = copyCustomLabel(newColumn, previousColumn);
    }
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
    let newColumn = operationDefinition.onFieldChange(previousColumn, field);
    if (!shouldResetLabel) {
      newColumn = copyCustomLabel(newColumn, previousColumn);
    }

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
  visualizationGroups,
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
    const newLayer = replaceColumn({
      layer,
      columnId,
      op,
      field,
      indexPattern,
      visualizationGroups,
    });
    const newDefinition = operationDefinitionMap[op];
    const newColumn = newLayer.columns[columnId];
    return (
      Boolean(newColumn) &&
      !newLayer.incompleteColumns?.[columnId] &&
      filterOperations(newColumn) &&
      !newDefinition.getErrorMessage?.(newLayer, columnId, indexPattern)?.length
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
  visualizationGroups,
}: {
  layer: IndexPatternLayer;
  columnId: string;
  previousColumn: IndexPatternColumn;
  op: OperationType;
  indexPattern: IndexPattern;
  visualizationGroups: VisualizationDimensionGroupConfig[];
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

      const newLayer = {
        ...layer,
        columns: {
          ...layer.columns,
          [newId]: {
            ...previousColumn,
            // drop the filter for the referenced column because the wrapping operation
            // is filterable as well and will handle it one level higher.
            filter: operationDefinition.filterable ? undefined : previousColumn.filter,
            timeShift: operationDefinition.shiftable ? undefined : previousColumn.timeShift,
          },
        },
      };
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
          visualizationGroups,
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
          visualizationGroups,
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
              visualizationGroups,
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

function copyCustomLabel(newColumn: IndexPatternColumn, previousOptions: IndexPatternColumn) {
  const adjustedColumn = { ...newColumn };
  const operationChanged = newColumn.operationType !== previousOptions.operationType;
  const fieldChanged =
    ('sourceField' in newColumn && newColumn.sourceField) !==
    ('sourceField' in previousOptions && previousOptions.sourceField);
  // only copy custom label if either used operation or used field stayed the same
  if (previousOptions.customLabel && (!operationChanged || !fieldChanged)) {
    adjustedColumn.customLabel = true;
    adjustedColumn.label = previousOptions.label;
  }
  return adjustedColumn;
}

function addBucket(
  layer: IndexPatternLayer,
  column: IndexPatternColumn,
  addedColumnId: string,
  visualizationGroups: VisualizationDimensionGroupConfig[],
  targetGroup?: string
): IndexPatternLayer {
  const [buckets, metrics] = partition(
    layer.columnOrder,
    (colId) => layer.columns[colId].isBucketed
  );

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
  updatedColumnOrder = reorderByGroups(
    visualizationGroups,
    targetGroup,
    updatedColumnOrder,
    addedColumnId
  );
  const tempLayer = {
    ...resetIncomplete(layer, addedColumnId),
    columns: { ...layer.columns, [addedColumnId]: column },
    columnOrder: updatedColumnOrder,
  };
  return {
    ...tempLayer,
    columns: adjustColumnReferencesForChangedColumn(tempLayer, addedColumnId),
    columnOrder: getColumnOrder(tempLayer),
  };
}

export function reorderByGroups(
  visualizationGroups: VisualizationDimensionGroupConfig[],
  targetGroup: string | undefined,
  updatedColumnOrder: string[],
  addedColumnId: string
) {
  const hidesColumnGrouping =
    targetGroup && visualizationGroups.find((group) => group.groupId === targetGroup)?.hideGrouping;

  // if column grouping is disabled, keep bucket aggregations in the same order as the groups
  // if grouping is known
  if (hidesColumnGrouping) {
    const orderedVisualizationGroups = [...visualizationGroups];
    orderedVisualizationGroups.sort((group1, group2) => {
      if (typeof group1.nestingOrder === undefined) {
        return -1;
      }
      if (typeof group2.nestingOrder === undefined) {
        return 1;
      }
      return group1.nestingOrder! - group2.nestingOrder!;
    });
    const columnGroupIndex: Record<string, number> = {};
    updatedColumnOrder.forEach((columnId) => {
      const groupIndex = orderedVisualizationGroups.findIndex(
        (group) =>
          (columnId === addedColumnId && group.groupId === targetGroup) ||
          group.accessors.some((acc) => acc.columnId === columnId)
      );
      if (groupIndex !== -1) {
        columnGroupIndex[columnId] = groupIndex;
      } else {
        // referenced columns won't show up in visualization groups - put them in the back of the list. This will work as they are always metrics
        columnGroupIndex[columnId] = updatedColumnOrder.length;
      }
    });

    return [...updatedColumnOrder].sort((a, b) => {
      return columnGroupIndex[a] - columnGroupIndex[b];
    });
  } else {
    return updatedColumnOrder;
  }
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
  return {
    ...tempLayer,
    columnOrder: getColumnOrder(tempLayer),
    columns: adjustColumnReferencesForChangedColumn(tempLayer, addedColumnId),
  };
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

// Column order mostly affects the visual order in the UI. It is derived
// from the columns objects, respecting any existing columnOrder relationships,
// but allowing new columns to be inserted
//
// This does NOT topologically sort references, as this would cause the order in the UI
// to change. Reference order is determined before creating the pipeline in to_expression
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

  const [aggregations, metrics] = partition(entries, ([, col]) => col.isBucketed);

  return aggregations.map(([id]) => id).concat(metrics.map(([id]) => id));
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
export function isColumnTransferable(
  column: IndexPatternColumn,
  newIndexPattern: IndexPattern,
  layer: IndexPatternLayer
): boolean {
  return (
    operationDefinitionMap[column.operationType].isTransferable(
      column,
      newIndexPattern,
      operationDefinitionMap
    ) &&
    (!('references' in column) ||
      column.references.every((columnId) =>
        isColumnTransferable(layer.columns[columnId], newIndexPattern, layer)
      ))
  );
}

export function updateLayerIndexPattern(
  layer: IndexPatternLayer,
  newIndexPattern: IndexPattern
): IndexPatternLayer {
  const keptColumns: IndexPatternLayer['columns'] = pickBy(layer.columns, (column) => {
    return isColumnTransferable(column, newIndexPattern, layer);
  });
  const newColumns: IndexPatternLayer['columns'] = mapValues(keptColumns, (column) => {
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
 * - If timeshift is used, terms go before date histogram
 * - If timeshift is used, only a single date histogram can be used
 */
export function getErrorMessages(
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  state: IndexPatternPrivateState,
  layerId: string,
  core: CoreStart
):
  | Array<
      | string
      | {
          message: string;
          fixAction?: {
            label: string;
            newState: (frame: FramePublicAPI) => Promise<IndexPatternPrivateState>;
          };
        }
    >
  | undefined {
  const columns = Object.entries(layer.columns);
  const visibleManagedReferences = columns.filter(
    ([columnId, column]) =>
      !isReferenced(layer, columnId) &&
      operationDefinitionMap[column.operationType].input === 'managedReference'
  );
  const skippedColumns = visibleManagedReferences.flatMap(([columnId]) =>
    getManagedColumnsFrom(columnId, layer.columns).map(([id]) => id)
  );
  const errors = columns
    .flatMap(([columnId, column]) => {
      if (skippedColumns.includes(columnId)) {
        return;
      }
      const def = operationDefinitionMap[column.operationType];
      if (def.getErrorMessage) {
        return def.getErrorMessage(layer, columnId, indexPattern, operationDefinitionMap);
      }
    })
    .map((errorMessage) => {
      if (typeof errorMessage !== 'object') {
        return errorMessage;
      }
      return {
        ...errorMessage,
        fixAction: errorMessage.fixAction
          ? {
              ...errorMessage.fixAction,
              newState: async (frame: FramePublicAPI) => ({
                ...state,
                layers: {
                  ...state.layers,
                  [layerId]: await errorMessage.fixAction!.newState(core, frame, layerId),
                },
              }),
            }
          : undefined,
      };
    })
    // remove the undefined values
    .filter((v) => v != null) as Array<
    | string
    | {
        message: string;
        fixAction?: {
          label: string;
          newState: (framePublicAPI: FramePublicAPI) => Promise<IndexPatternPrivateState>;
        };
      }
  >;

  return errors.length ? errors : undefined;
}

export function isReferenced(layer: IndexPatternLayer, columnId: string): boolean {
  const allReferences = Object.values(layer.columns).flatMap((col) =>
    'references' in col ? col.references : []
  );
  return allReferences.includes(columnId);
}

export function getReferencedColumnIds(layer: IndexPatternLayer, columnId: string): string[] {
  const referencedIds: string[] = [];
  function collect(id: string) {
    const column = layer.columns[id];
    if (column && 'references' in column) {
      const columnReferences = column.references;
      // only record references which have created columns yet
      const existingReferences = columnReferences.filter((reference) =>
        Boolean(layer.columns[reference])
      );
      referencedIds.push(...existingReferences);
      existingReferences.forEach(collect);
    }
  }
  collect(columnId);

  return referencedIds;
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

// managedReferences have a relaxed policy about operation allowed, so let them pass
function maybeValidateOperations({
  column,
  validation,
}: {
  column: IndexPatternColumn;
  validation: RequiredReference;
}) {
  if (!validation.specificOperations) {
    return true;
  }
  if (operationDefinitionMap[column.operationType].input === 'managedReference') {
    return true;
  }
  return validation.specificOperations.includes(column.operationType);
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
    maybeValidateOperations({
      column,
      validation,
    }) &&
    validation.validateMetadata(column)
  );
}

export function getManagedColumnsFrom(
  columnId: string,
  columns: Record<string, IndexPatternColumn>
): Array<[string, IndexPatternColumn]> {
  const allNodes: Record<string, string[]> = {};
  Object.entries(columns).forEach(([id, col]) => {
    allNodes[id] = 'references' in col ? [...col.references] : [];
  });
  const queue: string[] = allNodes[columnId];
  const store: Array<[string, IndexPatternColumn]> = [];

  while (queue.length > 0) {
    const nextId = queue.shift()!;
    store.push([nextId, columns[nextId]]);
    queue.push(...allNodes[nextId]);
  }
  return store.filter(([, column]) => column);
}
