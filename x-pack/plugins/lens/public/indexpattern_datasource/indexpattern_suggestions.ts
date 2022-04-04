/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, minBy, pick, mapValues, partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { VisualizeEditorLayersContext } from '../../../../../src/plugins/visualizations/public';
import { generateId } from '../id_generator';
import type { DatasourceSuggestion, TableChangeType } from '../types';
import { columnToOperation } from './indexpattern';
import {
  insertNewColumn,
  replaceColumn,
  getMetricOperationTypes,
  getOperationTypesForField,
  operationDefinitionMap,
  BaseIndexPatternColumn,
  OperationType,
  getExistingColumnGroups,
  isReferenced,
  getReferencedColumnIds,
  getSplitByTermsLayer,
  getSplitByFiltersLayer,
  computeLayerFromContext,
  hasTermsWithManyBuckets,
} from './operations';
import { hasField } from './pure_utils';
import type {
  IndexPattern,
  IndexPatternPrivateState,
  IndexPatternLayer,
  IndexPatternField,
} from './types';
import { documentField } from './document_field';
export type IndexPatternSuggestion = DatasourceSuggestion<IndexPatternPrivateState>;

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
  const layers = mapValues(updatedState.layers, (layer) => ({
    ...layer,
    columns: pick(layer.columns, layer.columnOrder) as Record<string, BaseIndexPatternColumn>,
  }));

  const columnOrder = layers[layerId].columnOrder;
  const columnMap = layers[layerId].columns as Record<string, BaseIndexPatternColumn>;
  const isMultiRow = Object.values(columnMap).some((column) => column.isBucketed);

  return {
    state: {
      ...updatedState,
      layers,
    },

    table: {
      columns: columnOrder
        // Hide any referenced columns from what visualizations know about
        .filter((columnId) => !isReferenced(layers[layerId]!, columnId))
        .map((columnId) => ({
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
  field: IndexPatternField,
  filterLayers?: (layerId: string) => boolean
): IndexPatternSuggestion[] {
  const layers = Object.keys(state.layers);
  let layerIds = layers.filter((id) => state.layers[id].indexPatternId === indexPatternId);
  if (filterLayers) {
    layerIds = layerIds.filter(filterLayers);
  }

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
    const mostEmptyLayerId = minBy(
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

// Called when the user navigates from Visualize editor to Lens
export function getDatasourceSuggestionsForVisualizeCharts(
  state: IndexPatternPrivateState,
  context: VisualizeEditorLayersContext[]
): IndexPatternSuggestion[] {
  const layers = Object.keys(state.layers);
  const layerIds = layers.filter(
    (id) => state.layers[id].indexPatternId === context[0].indexPatternId
  );
  if (layerIds.length !== 0) return [];
  return getEmptyLayersSuggestionsForVisualizeCharts(state, context);
}

function getEmptyLayersSuggestionsForVisualizeCharts(
  state: IndexPatternPrivateState,
  context: VisualizeEditorLayersContext[]
): IndexPatternSuggestion[] {
  const suggestions: IndexPatternSuggestion[] = [];
  for (let layerIdx = 0; layerIdx < context.length; layerIdx++) {
    const layer = context[layerIdx];
    const indexPattern = state.indexPatterns[layer.indexPatternId];
    if (!indexPattern) return [];

    const newId = generateId();
    let newLayer: IndexPatternLayer | undefined;
    if (indexPattern.timeFieldName) {
      newLayer = createNewTimeseriesLayerWithMetricAggregationFromVizEditor(indexPattern, layer);
    }
    if (newLayer) {
      const suggestion = buildSuggestion({
        state,
        updatedLayer: newLayer,
        layerId: newId,
        changeType: 'initial',
      });
      const layerId = Object.keys(suggestion.state.layers)[0];
      context[layerIdx].layerId = layerId;
      suggestions.push(suggestion);
    }
  }
  return suggestions;
}

function createNewTimeseriesLayerWithMetricAggregationFromVizEditor(
  indexPattern: IndexPattern,
  layer: VisualizeEditorLayersContext
): IndexPatternLayer | undefined {
  const { timeFieldName, splitMode, splitFilters, metrics, timeInterval, dropPartialBuckets } =
    layer;
  const dateField = indexPattern.getFieldByName(timeFieldName!);

  const splitFields = layer.splitFields
    ? (layer.splitFields
        .map((item) => indexPattern.getFieldByName(item))
        .filter(Boolean) as IndexPatternField[])
    : null;

  // generate the layer for split by terms
  if (splitMode === 'terms' && splitFields?.length) {
    return getSplitByTermsLayer(indexPattern, splitFields, dateField, layer);
    // generate the layer for split by filters
  } else if (splitMode?.includes('filter') && splitFilters && splitFilters.length) {
    return getSplitByFiltersLayer(indexPattern, dateField, layer);
  } else {
    const copyMetricsArray = [...metrics];
    const computedLayer = computeLayerFromContext(
      metrics.length === 1,
      copyMetricsArray,
      indexPattern,
      layer.format,
      layer.label
    );
    // static values layers do not need a date histogram column
    if (Object.values(computedLayer.columns)[0].isStaticValue) {
      return computedLayer;
    }

    return insertNewColumn({
      op: 'date_histogram',
      layer: computedLayer,
      columnId: generateId(),
      field: dateField,
      indexPattern,
      visualizationGroups: [],
      columnParams: {
        interval: timeInterval,
        dropPartials: dropPartialBuckets,
      },
    });
  }
}

// Called when the user navigates from Discover to Lens (Visualize button)
export function getDatasourceSuggestionsForVisualizeField(
  state: IndexPatternPrivateState,
  indexPatternId: string,
  fieldName: string
): IndexPatternSuggestion[] {
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
  const suggestions: IndexPatternSuggestion[] = [];

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
            visualizationGroups: [],
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
            visualizationGroups: [],
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
        op: metricOperation.type as OperationType,
        visualizationGroups: [],
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

      const [, metrics, references] = getExistingColumnGroups(layer);
      // TODO: Write test for the case where we have exactly one metric and one reference. We shouldn't switch the inner metric.
      if (metrics.length === 1 && references.length === 0) {
        const layerWithReplacedMetric = replaceColumn({
          layer,
          indexPattern,
          field,
          columnId: metrics[0],
          op: metricOperation.type as OperationType,
          visualizationGroups: [],
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

  if (!fieldInUse) {
    const metricSuggestion = createMetricSuggestion(indexPattern, layerId, state, field);
    if (metricSuggestion) {
      suggestions.push(metricSuggestion);
    }
  }

  return suggestions;
}

function getEmptyLayerSuggestionsForField(
  state: IndexPatternPrivateState,
  layerId: string,
  indexPatternId: string,
  field: IndexPatternField
): IndexPatternSuggestion[] {
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
    op: operation,
    layer: insertNewColumn({
      op: 'count',
      layer: { indexPatternId: indexPattern.id, columns: {}, columnOrder: [] },
      columnId: generateId(),
      field: documentField,
      indexPattern,
      visualizationGroups: [],
    }),
    columnId: generateId(),
    field,
    indexPattern,
    visualizationGroups: [],
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
      op: metricOperation.type as OperationType,
      layer: { indexPatternId: indexPattern.id, columns: {}, columnOrder: [] },
      columnId: generateId(),
      field,
      indexPattern,
      visualizationGroups: [],
    }),
    columnId: generateId(),
    field: dateField,
    indexPattern,
    visualizationGroups: [],
  });
}

export function getDatasourceSuggestionsFromCurrentState(
  state: IndexPatternPrivateState,
  filterLayers: (layerId: string) => boolean = () => true
): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
  const layers = Object.entries(state.layers || {}).filter(([layerId]) => filterLayers(layerId));

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

  return flatten(
    layers
      .filter(([_id, layer]) => layer.columnOrder.length && layer.indexPatternId)
      .map(([layerId, layer]) => {
        const indexPattern = state.indexPatterns[layer.indexPatternId];
        const [buckets, metrics, references] = getExistingColumnGroups(layer);
        const timeDimension = layer.columnOrder.find(
          (columnId) =>
            layer.columns[columnId].isBucketed && layer.columns[columnId].dataType === 'date'
        );
        const timeField =
          indexPattern?.timeFieldName && indexPattern.getFieldByName(indexPattern.timeFieldName);

        const hasNumericDimension =
          buckets.length === 1 &&
          buckets.some((columnId) => layer.columns[columnId].dataType === 'number');

        const suggestions: Array<DatasourceSuggestion<IndexPatternPrivateState>> = [];

        // Always suggest an unchanged table, including during invalid states
        suggestions.push(
          buildSuggestion({
            state,
            layerId,
            changeType: 'unchanged',
          })
        );

        if (!references.length && metrics.length && buckets.length === 0) {
          if (timeField && buckets.length < 1 && !hasTermsWithManyBuckets(layer)) {
            // suggest current metric over time if there is a default time field
            suggestions.push(createSuggestionWithDefaultDateHistogram(state, layerId, timeField));
          }
          if (indexPattern) {
            suggestions.push(...createAlternativeMetricSuggestions(indexPattern, layerId, state));
          }
        } else {
          suggestions.push(...createSimplifiedTableSuggestions(state, layerId));

          // base range intervals are of number dataType.
          // Custom range/intervals have a different dataType so they still receive the Over Time suggestion
          if (
            !timeDimension &&
            timeField &&
            buckets.length < 2 &&
            !hasNumericDimension &&
            !hasTermsWithManyBuckets(layer)
          ) {
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
      visualizationGroups: [],
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
  const topLevelMetricColumns = layer.columnOrder.filter(
    (columnId) => !isReferenced(layer, columnId)
  );

  topLevelMetricColumns.forEach((columnId) => {
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
        visualizationGroups: [],
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
      visualizationGroups: [],
    }),
    label: i18n.translate('xpack.lens.indexpattern.suggestions.overTimeLabel', {
      defaultMessage: 'Over time',
    }),
    changeType: 'extended',
  });
}

function createSimplifiedTableSuggestions(state: IndexPatternPrivateState, layerId: string) {
  const layer = state.layers[layerId];

  const [availableBucketedColumns, availableMetricColumns] = partition(
    layer.columnOrder,
    (colId) => layer.columns[colId].isBucketed
  );
  const topLevelMetricColumns = availableMetricColumns.filter(
    (columnId) => !isReferenced(layer, columnId)
  );

  return flatten(
    availableBucketedColumns.map((_col, index) => {
      // build suggestions with fewer buckets
      const bucketedColumns = availableBucketedColumns.slice(0, index + 1);
      const allMetricsSuggestion = {
        ...layer,
        columnOrder: [...bucketedColumns, ...availableMetricColumns],
        noBuckets: false,
      };

      if (bucketedColumns.length > 0 && topLevelMetricColumns.length > 1) {
        return [
          {
            ...layer,
            columnOrder: [
              ...bucketedColumns,
              topLevelMetricColumns[0],
              ...getReferencedColumnIds(layer, topLevelMetricColumns[0]),
            ],
            noBuckets: false,
          },
        ];
      } else if (availableBucketedColumns.length > 1) {
        return allMetricsSuggestion;
      }
      return [];
    })
  )
    .concat(
      // if there is just a single top level metric, the unchanged suggestion will take care of this case - only split up if there are multiple metrics or at least one bucket
      availableBucketedColumns.length > 0 || topLevelMetricColumns.length > 1
        ? topLevelMetricColumns.map((columnId) => {
            return {
              ...layer,
              columnOrder: [columnId, ...getReferencedColumnIds(layer, columnId)],
              noBuckets: true,
            };
          })
        : []
    )
    .map(({ noBuckets, ...updatedLayer }) => {
      return buildSuggestion({
        state,
        layerId,
        updatedLayer,
        changeType: 'reduced',
        label: noBuckets
          ? getMetricSuggestionTitle(updatedLayer, availableMetricColumns.length === 1)
          : undefined,
      });
    });
}

function getMetricSuggestionTitle(layer: IndexPatternLayer, onlySimpleMetric: boolean) {
  const { operationType, label } = layer.columns[layer.columnOrder[0]];
  return i18n.translate('xpack.lens.indexpattern.suggestions.overallLabel', {
    defaultMessage: '{operation} overall',
    values: {
      operation: onlySimpleMetric ? operationDefinitionMap[operationType].displayName : label,
    },
    description:
      'Title of a suggested chart containing only a single numerical metric calculated over all available data',
  });
}
