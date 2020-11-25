/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _, { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import { generateId } from '../id_generator';
import { DatasourceSuggestion, TableChangeType } from '../types';
import { columnToOperation } from './indexpattern';
import {
  insertNewColumn,
  replaceColumn,
  getMetricOperationTypes,
  getOperationTypesForField,
  operationDefinitionMap,
  IndexPatternColumn,
  OperationType,
} from './operations';
import { hasField, hasInvalidReference } from './utils';
import {
  IndexPattern,
  IndexPatternPrivateState,
  IndexPatternLayer,
  IndexPatternField,
} from './types';
import { documentField } from './document_field';

type IndexPatternSugestion = DatasourceSuggestion<IndexPatternPrivateState>;

function buildSuggestion({
  state,
  updatedLayer,
  layerId,
  label,
  changeType,
}: {
  state: IndexPatternPrivateState;
  layerId: string;
  changeType: TableChangeType;
  updatedLayer?: IndexPatternLayer;
  label?: string;
}): DatasourceSuggestion<IndexPatternPrivateState> {
  const updatedState = updatedLayer
    ? {
        ...state,
        layers: {
          ...state.layers,
          [layerId]: updatedLayer,
        },
      }
    : state;

  // It's fairly easy to accidentally introduce a mismatch between
  // columnOrder and columns, so this is a safeguard to ensure the
  // two match up.
  const layers = _.mapValues(updatedState.layers, (layer) => ({
    ...layer,
    columns: _.pick(layer.columns, layer.columnOrder) as Record<string, IndexPatternColumn>,
  }));

  const columnOrder = layers[layerId].columnOrder;
  const columnMap = layers[layerId].columns as Record<string, IndexPatternColumn>;
  const isMultiRow = Object.values(columnMap).some((column) => column.isBucketed);

  return {
    state: {
      ...updatedState,
      layers,
    },

    table: {
      columns: columnOrder.map((columnId) => ({
        columnId,
        operation: columnToOperation(columnMap[columnId]),
      })),
      isMultiRow,
      layerId,
      changeType,
      label,
    },

    keptLayerIds: Object.keys(state.layers),
  };
}

export function getDatasourceSuggestionsForField(
  state: IndexPatternPrivateState,
  indexPatternId: string,
  field: IndexPatternField
): IndexPatternSugestion[] {
  if (hasInvalidReference(state)) return [];
  const layers = Object.keys(state.layers);
  const layerIds = layers.filter((id) => state.layers[id].indexPatternId === indexPatternId);

  if (layerIds.length === 0) {
    // The field we're suggesting on does not match any existing layer.
    // This generates a set of suggestions where we add a layer.
    // A second set of suggestions is generated for visualizations that don't work with layers
    const newId = generateId();
    return getEmptyLayerSuggestionsForField(state, newId, indexPatternId, field).concat(
      getEmptyLayerSuggestionsForField({ ...state, layers: {} }, newId, indexPatternId, field)
    );
  } else {
    // The field we're suggesting on matches an existing layer. In this case we find the layer with
    // the fewest configured columns and try to add the field to this table. If this layer does not
    // contain any layers yet, behave as if there is no layer.
    const mostEmptyLayerId = _.minBy(
      layerIds,
      (layerId) => state.layers[layerId].columnOrder.length
    ) as string;
    if (state.layers[mostEmptyLayerId].columnOrder.length === 0) {
      return getEmptyLayerSuggestionsForField(state, mostEmptyLayerId, indexPatternId, field);
    } else {
      return getExistingLayerSuggestionsForField(state, mostEmptyLayerId, field);
    }
  }
}

// Called when the user navigates from Discover to Lens (Visualize button)
export function getDatasourceSuggestionsForVisualizeField(
  state: IndexPatternPrivateState,
  indexPatternId: string,
  fieldName: string
): IndexPatternSugestion[] {
  const layers = Object.keys(state.layers);
  const layerIds = layers.filter((id) => state.layers[id].indexPatternId === indexPatternId);
  // Identify the field by the indexPatternId and the fieldName
  const indexPattern = state.indexPatterns[indexPatternId];
  const field = indexPattern.getFieldByName(fieldName);

  if (layerIds.length !== 0 || !field) return [];
  const newId = generateId();
  return getEmptyLayerSuggestionsForField(state, newId, indexPatternId, field).concat(
    getEmptyLayerSuggestionsForField({ ...state, layers: {} }, newId, indexPatternId, field)
  );
}

// TODO: Stop hard-coding the specific operation types
function getBucketOperation(field: IndexPatternField) {
  // We allow numeric bucket types in some cases, but it's generally not the right suggestion,
  // so we eliminate it here.
  if (field.type !== 'number') {
    return getOperationTypesForField(field).find((op) => op === 'date_histogram' || op === 'terms');
  }
}

function getExistingLayerSuggestionsForField(
  state: IndexPatternPrivateState,
  layerId: string,
  field: IndexPatternField
) {
  const layer = state.layers[layerId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];
  const operations = getOperationTypesForField(field);
  const usableAsBucketOperation = getBucketOperation(field);
  const fieldInUse = Object.values(layer.columns).some(
    (column) => hasField(column) && column.sourceField === field.name
  );
  const suggestions: IndexPatternSugestion[] = [];

  if (usableAsBucketOperation && !fieldInUse) {
    if (
      usableAsBucketOperation === 'date_histogram' &&
      layer.columnOrder.some((colId) => layer.columns[colId].operationType === 'date_histogram')
    ) {
      const previousDate = layer.columnOrder.find(
        (colId) => layer.columns[colId].operationType === 'date_histogram'
      )!;
      suggestions.push(
        buildSuggestion({
          state,
          updatedLayer: replaceColumn({
            layer,
            indexPattern,
            field,
            op: usableAsBucketOperation,
            columnId: previousDate,
          }),
          layerId,
          changeType: 'initial',
        })
      );
    } else {
      suggestions.push(
        buildSuggestion({
          state,
          updatedLayer: insertNewColumn({
            layer,
            indexPattern,
            field,
            op: usableAsBucketOperation,
            columnId: generateId(),
          }),
          layerId,
          changeType: 'extended',
        })
      );
    }
  }

  if (!usableAsBucketOperation && operations.length > 0 && !fieldInUse) {
    const [metricOperation] = getMetricOperationTypes(field);
    if (metricOperation) {
      const layerWithNewMetric = insertNewColumn({
        layer,
        indexPattern,
        field,
        columnId: generateId(),
        op: metricOperation.type,
      });
      if (layerWithNewMetric) {
        suggestions.push(
          buildSuggestion({
            state,
            layerId,
            updatedLayer: layerWithNewMetric,
            changeType: 'extended',
          })
        );
      }

      const [, metrics] = separateBucketColumns(layer);
      if (metrics.length === 1) {
        const layerWithReplacedMetric = replaceColumn({
          layer,
          indexPattern,
          field,
          columnId: metrics[0],
          op: metricOperation.type,
        });
        if (layerWithReplacedMetric) {
          suggestions.push(
            buildSuggestion({
              state,
              layerId,
              updatedLayer: layerWithReplacedMetric,
              changeType: 'extended',
            })
          );
        }
      }
    }
  }

  const metricSuggestion = createMetricSuggestion(indexPattern, layerId, state, field);
  if (metricSuggestion) {
    suggestions.push(metricSuggestion);
  }

  return suggestions;
}

function getEmptyLayerSuggestionsForField(
  state: IndexPatternPrivateState,
  layerId: string,
  indexPatternId: string,
  field: IndexPatternField
): IndexPatternSugestion[] {
  const indexPattern = state.indexPatterns[indexPatternId];
  let newLayer: IndexPatternLayer | undefined;
  const bucketOperation = getBucketOperation(field);
  if (bucketOperation) {
    newLayer = createNewLayerWithBucketAggregation(indexPattern, field, bucketOperation);
  } else if (indexPattern.timeFieldName && getOperationTypesForField(field).length > 0) {
    newLayer = createNewLayerWithMetricAggregation(indexPattern, field);
  }

  const newLayerSuggestions = newLayer
    ? [
        buildSuggestion({
          state,
          updatedLayer: newLayer,
          layerId,
          changeType: 'initial',
        }),
      ]
    : [];

  const metricLayer = createMetricSuggestion(indexPattern, layerId, state, field);

  return metricLayer ? newLayerSuggestions.concat(metricLayer) : newLayerSuggestions;
}

function createNewLayerWithBucketAggregation(
  indexPattern: IndexPattern,
  field: IndexPatternField,
  operation: OperationType
): IndexPatternLayer {
  return insertNewColumn({
    op: 'count',
    layer: insertNewColumn({
      op: operation,
      layer: { indexPatternId: indexPattern.id, columns: {}, columnOrder: [] },
      columnId: generateId(),
      field,
      indexPattern,
    }),
    columnId: generateId(),
    field: documentField,
    indexPattern,
  });
}

function createNewLayerWithMetricAggregation(
  indexPattern: IndexPattern,
  field: IndexPatternField
): IndexPatternLayer | undefined {
  const dateField = indexPattern.getFieldByName(indexPattern.timeFieldName!);
  const [metricOperation] = getMetricOperationTypes(field);
  if (!metricOperation) {
    return;
  }

  return insertNewColumn({
    op: 'date_histogram',
    layer: insertNewColumn({
      op: metricOperation.type,
      layer: { indexPatternId: indexPattern.id, columns: {}, columnOrder: [] },
      columnId: generateId(),
      field,
      indexPattern,
    }),
    columnId: generateId(),
    field: dateField,
    indexPattern,
  });
}

export function getDatasourceSuggestionsFromCurrentState(
  state: IndexPatternPrivateState
): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
  if (hasInvalidReference(state)) return [];
  const layers = Object.entries(state.layers || {});
  if (layers.length > 1) {
    // Return suggestions that reduce the data to each layer individually
    return layers
      .map(([layerId, layer], index) => {
        const hasMatchingLayer = layers.some(
          ([otherLayerId, otherLayer]) =>
            otherLayerId !== layerId && otherLayer.indexPatternId === layer.indexPatternId
        );

        const suggestionTitle = hasMatchingLayer
          ? i18n.translate('xpack.lens.indexPatternSuggestion.removeLayerPositionLabel', {
              defaultMessage: 'Show only layer {layerNumber}',
              values: { layerNumber: index + 1 },
            })
          : i18n.translate('xpack.lens.indexPatternSuggestion.removeLayerLabel', {
              defaultMessage: 'Show only {indexPatternTitle}',
              values: { indexPatternTitle: state.indexPatterns[layer.indexPatternId].title },
            });

        return buildSuggestion({
          state: {
            ...state,
            layers: {
              [layerId]: layer,
            },
          },
          layerId,
          changeType: 'layers',
          label: suggestionTitle,
        });
      })
      .concat([
        buildSuggestion({
          state,
          layerId: layers[0][0],
          changeType: 'unchanged',
        }),
      ]);
  }
  return _.flatten(
    Object.entries(state.layers || {})
      .filter(([_id, layer]) => layer.columnOrder.length && layer.indexPatternId)
      .map(([layerId, layer]) => {
        const indexPattern = state.indexPatterns[layer.indexPatternId];
        const [buckets, metrics] = separateBucketColumns(layer);
        const timeDimension = layer.columnOrder.find(
          (columnId) =>
            layer.columns[columnId].isBucketed && layer.columns[columnId].dataType === 'date'
        );
        const timeField =
          indexPattern.timeFieldName && indexPattern.getFieldByName(indexPattern.timeFieldName);

        const hasNumericDimension =
          buckets.length === 1 &&
          buckets.some((columnId) => layer.columns[columnId].dataType === 'number');

        const suggestions: Array<DatasourceSuggestion<IndexPatternPrivateState>> = [];
        if (metrics.length === 0) {
          // intermediary chart without metric, don't try to suggest reduced versions
          suggestions.push(
            buildSuggestion({
              state,
              layerId,
              changeType: 'unchanged',
            })
          );
        } else if (buckets.length === 0) {
          if (timeField) {
            // suggest current metric over time if there is a default time field
            suggestions.push(createSuggestionWithDefaultDateHistogram(state, layerId, timeField));
          }
          suggestions.push(...createAlternativeMetricSuggestions(indexPattern, layerId, state));
          // also suggest simple current state
          suggestions.push(
            buildSuggestion({
              state,
              layerId,
              changeType: 'unchanged',
            })
          );
        } else {
          suggestions.push(...createSimplifiedTableSuggestions(state, layerId));

          // base range intervals are of number dataType.
          // Custom range/intervals have a different dataType so they still receive the Over Time suggestion
          if (!timeDimension && timeField && !hasNumericDimension) {
            // suggest current configuration over time if there is a default time field
            // and no time dimension yet
            suggestions.push(createSuggestionWithDefaultDateHistogram(state, layerId, timeField));
          }

          if (buckets.length === 2) {
            suggestions.push(createChangedNestingSuggestion(state, layerId));
          }
        }
        return suggestions;
      })
  );
}

function createChangedNestingSuggestion(state: IndexPatternPrivateState, layerId: string) {
  const layer = state.layers[layerId];
  const [firstBucket, secondBucket, ...rest] = layer.columnOrder;
  const updatedLayer = { ...layer, columnOrder: [secondBucket, firstBucket, ...rest] };
  const indexPattern = state.indexPatterns[state.currentIndexPatternId];
  const firstBucketColumn = layer.columns[firstBucket];
  const firstBucketLabel =
    (hasField(firstBucketColumn) &&
      indexPattern.getFieldByName(firstBucketColumn.sourceField)?.displayName) ||
    '';
  const secondBucketColumn = layer.columns[secondBucket];
  const secondBucketLabel =
    (hasField(secondBucketColumn) &&
      indexPattern.getFieldByName(secondBucketColumn.sourceField)?.displayName) ||
    '';

  return buildSuggestion({
    state,
    layerId,
    updatedLayer,
    label: getNestedTitle([secondBucketLabel, firstBucketLabel]),
    changeType: 'reorder',
  });
}

function createMetricSuggestion(
  indexPattern: IndexPattern,
  layerId: string,
  state: IndexPatternPrivateState,
  field: IndexPatternField
) {
  const [operation] = getMetricOperationTypes(field);

  if (!operation) {
    return;
  }

  return buildSuggestion({
    layerId,
    state,
    changeType: 'initial',
    updatedLayer: insertNewColumn({
      layer: {
        indexPatternId: indexPattern.id,
        columns: {},
        columnOrder: [],
      },
      columnId: generateId(),
      op: operation.type,
      field: operation.type === 'count' ? documentField : field,
      indexPattern,
    }),
  });
}

function getNestedTitle([outerBucketLabel, innerBucketLabel]: string[]) {
  return i18n.translate('xpack.lens.indexpattern.suggestions.nestingChangeLabel', {
    defaultMessage: '{innerOperation} for each {outerOperation}',
    values: {
      innerOperation: innerBucketLabel,
      outerOperation: outerBucketLabel,
    },
  });
}

// Replaces all metrics on the table with a different field-based function
function createAlternativeMetricSuggestions(
  indexPattern: IndexPattern,
  layerId: string,
  state: IndexPatternPrivateState
) {
  const layer = state.layers[layerId];
  const suggestions: Array<DatasourceSuggestion<IndexPatternPrivateState>> = [];

  layer.columnOrder.forEach((columnId) => {
    const column = layer.columns[columnId];
    if (!hasField(column)) {
      return;
    }
    const field = indexPattern.getFieldByName(column.sourceField);
    if (!field) {
      return;
    }
    const possibleOperations = getMetricOperationTypes(field).filter(
      ({ type }) => type !== column.operationType
    );
    if (possibleOperations.length) {
      const layerWithNewMetric = replaceColumn({
        layer,
        indexPattern,
        field,
        columnId,
        op: possibleOperations[0].type,
      });
      if (layerWithNewMetric) {
        suggestions.push(
          buildSuggestion({
            state,
            layerId,
            updatedLayer: layerWithNewMetric,
            changeType: 'initial',
          })
        );
      }
    }
  });
  return suggestions;
}

function createSuggestionWithDefaultDateHistogram(
  state: IndexPatternPrivateState,
  layerId: string,
  timeField: IndexPatternField
) {
  const layer = state.layers[layerId];
  const indexPattern = state.indexPatterns[layer.indexPatternId];

  return buildSuggestion({
    state,
    layerId,
    updatedLayer: insertNewColumn({
      layer,
      indexPattern,
      field: timeField,
      op: 'date_histogram',
      columnId: generateId(),
    }),
    label: i18n.translate('xpack.lens.indexpattern.suggestions.overTimeLabel', {
      defaultMessage: 'Over time',
    }),
    changeType: 'extended',
  });
}

function createSimplifiedTableSuggestions(state: IndexPatternPrivateState, layerId: string) {
  const layer = state.layers[layerId];

  const [availableBucketedColumns, availableMetricColumns] = separateBucketColumns(layer);

  return _.flatten(
    availableBucketedColumns.map((_col, index) => {
      // build suggestions with fewer buckets
      const bucketedColumns = availableBucketedColumns.slice(0, index + 1);
      const allMetricsSuggestion = {
        ...layer,
        columnOrder: [...bucketedColumns, ...availableMetricColumns],
      };

      if (availableMetricColumns.length > 1) {
        return [
          allMetricsSuggestion,
          { ...layer, columnOrder: [...bucketedColumns, availableMetricColumns[0]] },
        ];
      } else {
        return allMetricsSuggestion;
      }
    })
  )
    .concat(
      availableMetricColumns.map((columnId) => {
        // build suggestions with only metrics
        return { ...layer, columnOrder: [columnId] };
      })
    )
    .map((updatedLayer) => {
      return buildSuggestion({
        state,
        layerId,
        updatedLayer,
        changeType:
          layer.columnOrder.length === updatedLayer.columnOrder.length ? 'unchanged' : 'reduced',
        label:
          updatedLayer.columnOrder.length === 1
            ? getMetricSuggestionTitle(updatedLayer, availableMetricColumns.length === 1)
            : undefined,
      });
    });
}

function getMetricSuggestionTitle(layer: IndexPatternLayer, onlyMetric: boolean) {
  const { operationType, label } = layer.columns[layer.columnOrder[0]];
  return i18n.translate('xpack.lens.indexpattern.suggestions.overallLabel', {
    defaultMessage: '{operation} overall',
    values: {
      operation: onlyMetric ? operationDefinitionMap[operationType].displayName : label,
    },
    description:
      'Title of a suggested chart containing only a single numerical metric calculated over all available data',
  });
}

function separateBucketColumns(layer: IndexPatternLayer) {
  return partition(layer.columnOrder, (columnId) => layer.columns[columnId].isBucketed);
}
