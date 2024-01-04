/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { SavedObjectReference } from '@kbn/core/public';
import {
  EventAnnotationGroupConfig,
  EVENT_ANNOTATION_GROUP_TYPE,
} from '@kbn/event-annotation-common';
import { v4 as uuidv4 } from 'uuid';
import { isQueryAnnotationConfig } from '@kbn/event-annotation-components';
import { i18n } from '@kbn/i18n';
import fastIsEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import { validateQuery } from '@kbn/visualization-ui-components';
import { DataViewsState } from '../../state_management';
import { FramePublicAPI, DatasourcePublicAPI, AnnotationGroups } from '../../types';
import {
  visualizationTypes,
  XYLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  SeriesType,
  YConfig,
  XYState,
  XYPersistedState,
  XYAnnotationLayerConfig,
  XYPersistedLayerConfig,
  XYByReferenceAnnotationLayerConfig,
  XYPersistedByReferenceAnnotationLayerConfig,
  XYPersistedLinkedByValueAnnotationLayerConfig,
} from './types';
import {
  getDataLayers,
  isAnnotationsLayer,
  isDataLayer,
  isPersistedByReferenceAnnotationsLayer,
  isByReferenceAnnotationsLayer,
  isPersistedByValueAnnotationsLayer,
  isPersistedAnnotationsLayer,
} from './visualization_helpers';
import { nonNullable } from '../../utils';

export function isHorizontalSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_horizontal' ||
    seriesType === 'bar_horizontal_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked'
  );
}

export function isPercentageSeries(seriesType: SeriesType) {
  return (
    seriesType === 'bar_percentage_stacked' ||
    seriesType === 'bar_horizontal_percentage_stacked' ||
    seriesType === 'area_percentage_stacked'
  );
}

export function isStackedChart(seriesType: SeriesType) {
  return seriesType.includes('stacked');
}

export function isHorizontalChart(layers: XYLayerConfig[]) {
  return getDataLayers(layers).every((l) => isHorizontalSeries(l.seriesType));
}

export function getIconForSeries(type: SeriesType): EuiIconType {
  const definition = visualizationTypes.find((t) => t.id === type);

  if (!definition) {
    throw new Error(`Unknown series type ${type}`);
  }

  return (definition.icon as EuiIconType) || 'empty';
}

export const getSeriesColor = (layer: XYLayerConfig, accessor: string) => {
  if (isAnnotationsLayer(layer)) {
    return layer?.annotations?.find((ann) => ann.id === accessor)?.color || null;
  }
  if (isDataLayer(layer) && layer.splitAccessor && !layer.collapseFn) {
    return null;
  }
  return (
    layer?.yConfig?.find((yConfig: YConfig) => yConfig.forAccessor === accessor)?.color || null
  );
};

export const getColumnToLabelMap = (
  layer: XYDataLayerConfig | XYReferenceLineLayerConfig,
  datasource?: DatasourcePublicAPI
) => {
  const columnToLabel: Record<string, string> = {};
  layer.accessors
    .concat(isDataLayer(layer) && layer.splitAccessor ? [layer.splitAccessor] : [])
    .forEach((accessor) => {
      const operation = datasource?.getOperationForColumnId(accessor);
      if (operation?.label) {
        columnToLabel[accessor] = operation.label;
      }
    });
  return columnToLabel;
};

export function hasHistogramSeries(
  layers: XYDataLayerConfig[] = [],
  datasourceLayers?: FramePublicAPI['datasourceLayers']
) {
  if (!datasourceLayers) {
    return false;
  }
  const validLayers = layers.filter(({ accessors }) => accessors.length);

  return validLayers.some(({ layerId, xAccessor }: XYDataLayerConfig) => {
    if (!xAccessor) {
      return false;
    }

    const xAxisOperation = datasourceLayers[layerId]?.getOperationForColumnId(xAccessor);
    return (
      xAxisOperation &&
      xAxisOperation.isBucketed &&
      xAxisOperation.scale &&
      xAxisOperation.scale !== 'ordinal'
    );
  });
}

function getLayerReferenceName(layerId: string) {
  return `xy-visualization-layer-${layerId}`;
}

export const annotationLayerHasUnsavedChanges = (layer: XYAnnotationLayerConfig) => {
  if (!isByReferenceAnnotationsLayer(layer)) {
    return false;
  }

  type PropsToCompare = Pick<
    EventAnnotationGroupConfig,
    'annotations' | 'ignoreGlobalFilters' | 'indexPatternId'
  >;

  const currentConfig: PropsToCompare = {
    annotations: layer.annotations,
    ignoreGlobalFilters: layer.ignoreGlobalFilters,
    indexPatternId: layer.indexPatternId,
  };

  const savedConfig: PropsToCompare = {
    annotations: layer.__lastSaved.annotations,
    ignoreGlobalFilters: layer.__lastSaved.ignoreGlobalFilters,
    indexPatternId: layer.__lastSaved.indexPatternId,
  };

  return !fastIsEqual(currentConfig, savedConfig);
};

export function getPersistableState(state: XYState) {
  const savedObjectReferences: SavedObjectReference[] = [];
  const persistableLayers: XYPersistedLayerConfig[] = [];
  state.layers.forEach((layer) => {
    if (!isAnnotationsLayer(layer)) {
      persistableLayers.push(layer);
    } else {
      if (isByReferenceAnnotationsLayer(layer)) {
        const referenceName = `ref-${uuidv4()}`;
        savedObjectReferences.push({
          type: EVENT_ANNOTATION_GROUP_TYPE,
          id: layer.annotationGroupId,
          name: referenceName,
        });

        if (!annotationLayerHasUnsavedChanges(layer)) {
          const persistableLayer: XYPersistedByReferenceAnnotationLayerConfig = {
            persistanceType: 'byReference',
            layerId: layer.layerId,
            layerType: layer.layerType,
            annotationGroupRef: referenceName,
          };

          persistableLayers.push(persistableLayer);
        } else {
          const persistableLayer: XYPersistedLinkedByValueAnnotationLayerConfig = {
            persistanceType: 'linked',
            cachedMetadata: layer.cachedMetadata || {
              title: layer.__lastSaved.title,
              description: layer.__lastSaved.description,
              tags: layer.__lastSaved.tags,
            },
            layerId: layer.layerId,
            layerType: layer.layerType,
            annotationGroupRef: referenceName,
            annotations: layer.annotations,
            ignoreGlobalFilters: layer.ignoreGlobalFilters,
          };
          persistableLayers.push(persistableLayer);

          savedObjectReferences.push({
            type: 'index-pattern',
            id: layer.indexPatternId,
            name: getLayerReferenceName(layer.layerId),
          });
        }
      } else {
        const { indexPatternId, ...persistableLayer } = layer;
        savedObjectReferences.push({
          type: 'index-pattern',
          id: indexPatternId,
          name: getLayerReferenceName(layer.layerId),
        });
        persistableLayers.push({ ...persistableLayer, persistanceType: 'byValue' });
      }
    }
  });
  return { savedObjectReferences, state: { ...state, layers: persistableLayers } };
}

export function isPersistedState(state: XYPersistedState | XYState): state is XYPersistedState {
  return state.layers.some(isPersistedAnnotationsLayer);
}

export function injectReferences(
  state: XYPersistedState,
  annotationGroups?: AnnotationGroups,
  references?: SavedObjectReference[]
): XYState {
  if (!references || !references.length) {
    return state as XYState;
  }

  if (!annotationGroups) {
    throw new Error(
      'xy visualization: injecting references relies on annotation groups but they were not provided'
    );
  }

  // called on-demand since indexPattern reference won't be here on the vis if its a by-reference group
  const getIndexPatternIdFromReferences = (annotationLayerId: string) => {
    const fallbackIndexPatternId = references.find(({ type }) => type === 'index-pattern')!.id;
    return (
      references.find(({ name }) => name === getLayerReferenceName(annotationLayerId))?.id ||
      fallbackIndexPatternId
    );
  };

  return {
    ...state,
    layers: state.layers
      .map((persistedLayer) => {
        if (!isPersistedAnnotationsLayer(persistedLayer)) {
          return persistedLayer as XYLayerConfig;
        }

        let injectedLayer: XYAnnotationLayerConfig;

        if (isPersistedByValueAnnotationsLayer(persistedLayer)) {
          injectedLayer = {
            ...persistedLayer,
            indexPatternId: getIndexPatternIdFromReferences(persistedLayer.layerId),
          };
        } else {
          const annotationGroupId = references?.find(
            ({ name }) => name === persistedLayer.annotationGroupRef
          )?.id;

          const annotationGroup = annotationGroupId
            ? annotationGroups[annotationGroupId]
            : undefined;

          if (!annotationGroupId || !annotationGroup) {
            return undefined; // the annotation group this layer was referencing is gone, so remove the layer
          }

          // declared as a separate variable for type checking
          const commonProps: Pick<
            XYByReferenceAnnotationLayerConfig,
            'layerId' | 'layerType' | 'annotationGroupId' | '__lastSaved'
          > = {
            layerId: persistedLayer.layerId,
            layerType: persistedLayer.layerType,
            annotationGroupId,
            __lastSaved: annotationGroup,
          };

          if (isPersistedByReferenceAnnotationsLayer(persistedLayer)) {
            // a clean by-reference layer inherits everything from the library annotation group
            injectedLayer = {
              ...commonProps,
              ignoreGlobalFilters: annotationGroup.ignoreGlobalFilters,
              indexPatternId: annotationGroup.indexPatternId,
              annotations: cloneDeep(annotationGroup.annotations),
            };
          } else {
            // a linked by-value layer gets settings from visualization state while
            // still maintaining the reference to the library annotation group
            injectedLayer = {
              ...commonProps,
              ignoreGlobalFilters: persistedLayer.ignoreGlobalFilters,
              indexPatternId: getIndexPatternIdFromReferences(persistedLayer.layerId),
              annotations: cloneDeep(persistedLayer.annotations),
              cachedMetadata: persistedLayer.cachedMetadata,
            };
          }
        }

        return injectedLayer;
      })
      .filter(nonNullable),
  };
}

export function getAnnotationLayerErrors(
  layer: XYAnnotationLayerConfig,
  columnId: string,
  dataViews: DataViewsState
): string[] {
  if (!layer) {
    return [];
  }
  const annotation = layer.annotations.find(({ id }) => id === columnId);
  if (!annotation || !isQueryAnnotationConfig(annotation)) {
    return [];
  }
  const layerDataView = dataViews.indexPatterns[layer.indexPatternId];

  const invalidMessages: string[] = [];

  if (annotation.timeField == null || annotation.timeField === '') {
    invalidMessages.push(
      i18n.translate('xpack.lens.xyChart.annotationError.timeFieldEmpty', {
        defaultMessage: 'Time field is missing',
      })
    );
  }

  if (annotation.timeField && !Boolean(layerDataView.getFieldByName(annotation.timeField))) {
    invalidMessages.push(
      i18n.translate('xpack.lens.xyChart.annotationError.timeFieldNotFound', {
        defaultMessage: 'Time field {timeField} not found in data view {dataView}',
        values: { timeField: annotation.timeField, dataView: layerDataView.title },
      })
    );
  }

  const { isValid, error } = validateQuery(annotation?.filter, layerDataView);
  if (!isValid && error) {
    invalidMessages.push(error);
  }
  if (annotation.textField && !Boolean(layerDataView.getFieldByName(annotation.textField))) {
    invalidMessages.push(
      i18n.translate('xpack.lens.xyChart.annotationError.textFieldNotFound', {
        defaultMessage: 'Text field {textField} not found in data view {dataView}',
        values: { textField: annotation.textField, dataView: layerDataView.title },
      })
    );
  }
  if (annotation.extraFields?.length) {
    const missingTooltipFields = [];
    for (const field of annotation.extraFields) {
      if (!Boolean(layerDataView.getFieldByName(field))) {
        missingTooltipFields.push(field);
      }
    }
    if (missingTooltipFields.length) {
      invalidMessages.push(
        i18n.translate('xpack.lens.xyChart.annotationError.tooltipFieldNotFound', {
          defaultMessage:
            'Tooltip {missingFields, plural, one {field} other {fields}} {missingTooltipFields} not found in data view {dataView}',
          values: {
            missingTooltipFields: missingTooltipFields.join(', '),
            missingFields: missingTooltipFields.length,
            dataView: layerDataView.title,
          },
        })
      );
    }
  }

  return invalidMessages;
}
