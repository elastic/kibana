/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  isQueryAnnotationConfig,
  getAnnotationAccessor,
  createCopiedAnnotation,
} from '@kbn/event-annotation-components';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { getDefaultQueryAnnotation } from '@kbn/event-annotation-common';
import { IconChartBarAnnotations } from '@kbn/chart-icons';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { getUniqueLabelGenerator, isDraggedDataViewField } from '../../../utils';
import type { FramePublicAPI, Visualization } from '../../../types';
import { isHorizontalChart } from '../state_helpers';
import type { XYState, XYDataLayerConfig, XYAnnotationLayerConfig, XYLayerConfig } from '../types';
import {
  getAnnotationsLayers,
  getAxisName,
  getDataLayers,
  isAnnotationsLayer,
  isTimeChart,
} from '../visualization_helpers';
import { generateId } from '../../../id_generator';

const MAX_DATE = 8640000000000000;
const MIN_DATE = -8640000000000000;

export const defaultAnnotationLabel = i18n.translate('xpack.lens.xyChart.defaultAnnotationLabel', {
  defaultMessage: 'Event',
});

export const defaultRangeAnnotationLabel = i18n.translate(
  'xpack.lens.xyChart.defaultRangeAnnotationLabel',
  {
    defaultMessage: 'Event range',
  }
);

export function getStaticDate(dataLayers: XYDataLayerConfig[], frame: FramePublicAPI) {
  const dataLayersId = dataLayers.map(({ layerId }) => layerId);
  const { activeData, dateRange } = frame;

  const dateRangeMinValue = moment(dateRange.fromDate).valueOf();
  const dateRangeMaxValue = moment(dateRange.toDate).valueOf();
  const fallbackValue = moment((dateRangeMinValue + dateRangeMaxValue) / 2).toISOString();

  if (
    !activeData ||
    Object.entries(activeData)
      .filter(([key]) => dataLayersId.includes(key))
      .every(([, { rows }]) => !rows || !rows.length)
  ) {
    return fallbackValue;
  }

  const minDate = dataLayersId.reduce((acc, lId) => {
    const xAccessor = dataLayers.find((dataLayer) => dataLayer.layerId === lId)?.xAccessor!;
    const firstTimestamp = activeData[lId]?.rows?.[0]?.[xAccessor];
    return firstTimestamp && firstTimestamp < acc ? firstTimestamp : acc;
  }, MAX_DATE);

  const maxDate = dataLayersId.reduce((acc, lId) => {
    const xAccessor = dataLayers.find((dataLayer) => dataLayer.layerId === lId)?.xAccessor!;
    const lastTimestamp = activeData[lId]?.rows?.[activeData?.[lId]?.rows?.length - 1]?.[xAccessor];
    return lastTimestamp && lastTimestamp > acc ? lastTimestamp : acc;
  }, MIN_DATE);
  const middleDate = (minDate + maxDate) / 2;

  if (dateRangeMinValue < middleDate && dateRangeMaxValue > middleDate) {
    return moment(middleDate).toISOString();
  }
  return fallbackValue;
}

export const getAnnotationsSupportedLayer = (
  state?: XYState,
  frame?: Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>
) => {
  const dataLayers = getDataLayers(state?.layers || []);

  const hasDateHistogram = isTimeChart(dataLayers, frame);

  const initialDimensions =
    state && hasDateHistogram
      ? [
          {
            groupId: 'xAnnotations',
            columnId: generateId(),
          },
        ]
      : undefined;

  return {
    type: LayerTypes.ANNOTATIONS,
    label: i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabel', {
      defaultMessage: 'Annotations',
    }),
    icon: IconChartBarAnnotations,
    disabled: !hasDateHistogram,
    toolTipContent: !hasDateHistogram
      ? i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabelDisabledHelp', {
          defaultMessage: 'Annotations require a time based chart to work. Add a date histogram.',
        })
      : undefined,
    initialDimensions,
    noDatasource: true,
  };
};

export const onAnnotationDrop: Visualization<XYState>['onDrop'] = ({
  prevState,
  frame,
  source,
  target,
  dropType,
}) => {
  const targetLayer = prevState.layers.find((l) => l.layerId === target.layerId);
  if (!targetLayer || !isAnnotationsLayer(targetLayer)) {
    return prevState;
  }
  const targetAnnotation = targetLayer.annotations.find(({ id }) => id === target.columnId);
  const targetDataView = frame.dataViews.indexPatterns[targetLayer.indexPatternId];

  if (isDraggedDataViewField(source)) {
    const timeField = targetDataView.timeFieldName;
    switch (dropType) {
      case 'field_add':
        if (targetAnnotation || !timeField) {
          return prevState;
        }
        return {
          ...prevState,
          layers: prevState.layers.map(
            (l): XYLayerConfig =>
              l.layerId === target.layerId
                ? {
                    ...targetLayer,
                    annotations: [
                      ...targetLayer.annotations,
                      getDefaultQueryAnnotation(target.columnId, source.field.name, timeField),
                    ],
                  }
                : l
          ),
        };
      case 'field_replace':
        if (!targetAnnotation || !timeField) {
          return prevState;
        }

        return {
          ...prevState,
          layers: prevState.layers.map(
            (l): XYLayerConfig =>
              l.layerId === target.layerId
                ? {
                    ...targetLayer,
                    annotations: [
                      ...targetLayer.annotations.map((a) =>
                        a === targetAnnotation
                          ? {
                              ...targetAnnotation,
                              ...getDefaultQueryAnnotation(
                                target.columnId,
                                source.field.name,
                                timeField
                              ),
                            }
                          : a
                      ),
                    ],
                  }
                : l
          ),
        };
    }

    return prevState;
  }

  const sourceLayer = prevState.layers.find((l) => l.layerId === source.layerId);
  if (!sourceLayer || !isAnnotationsLayer(sourceLayer)) {
    return prevState;
  }
  const sourceAnnotation = sourceLayer.annotations.find(({ id }) => id === source.columnId);
  const sourceDataView = frame.dataViews.indexPatterns[sourceLayer.indexPatternId];
  if (sourceDataView !== targetDataView && isQueryAnnotationConfig(sourceAnnotation)) {
    return prevState;
  }
  switch (dropType) {
    case 'reorder':
      if (!targetAnnotation || !sourceAnnotation || source.layerId !== target.layerId) {
        return prevState;
      }
      const newAnnotations = targetLayer.annotations.filter((c) => c.id !== sourceAnnotation.id);
      const targetPosition = newAnnotations.findIndex((c) => c.id === targetAnnotation.id);
      const targetIndex = targetLayer.annotations.indexOf(sourceAnnotation);
      const sourceIndex = targetLayer.annotations.indexOf(targetAnnotation);
      newAnnotations.splice(
        targetIndex < sourceIndex ? targetPosition + 1 : targetPosition,
        0,
        sourceAnnotation
      );
      return {
        ...prevState,
        layers: prevState.layers.map((l) =>
          l.layerId === target.layerId ? { ...targetLayer, annotations: newAnnotations } : l
        ),
      };
    case 'swap_compatible':
      if (!targetAnnotation || !sourceAnnotation) {
        return prevState;
      }
      return {
        ...prevState,
        layers: prevState.layers.map((l): XYLayerConfig => {
          if (!isAnnotationsLayer(l) || !isAnnotationsLayer(targetLayer)) {
            return l;
          }
          if (l.layerId === target.layerId) {
            return {
              ...targetLayer,
              annotations: [
                ...targetLayer.annotations.map(
                  (a): EventAnnotationConfig => (a === targetAnnotation ? sourceAnnotation : a)
                ),
              ],
            };
          }
          if (l.layerId === source.layerId) {
            return {
              ...sourceLayer,
              annotations: [
                ...sourceLayer.annotations.map(
                  (a): EventAnnotationConfig => (a === sourceAnnotation ? targetAnnotation : a)
                ),
              ],
            };
          }
          return l;
        }),
      };
    case 'replace_compatible':
      if (!targetAnnotation || !sourceAnnotation) {
        return prevState;
      }

      return {
        ...prevState,
        layers: prevState.layers.map((l) => {
          if (l.layerId === source.layerId) {
            return {
              ...sourceLayer,
              annotations: sourceLayer.annotations.filter((a) => a !== sourceAnnotation),
            };
          }
          if (l.layerId === target.layerId) {
            return {
              ...targetLayer,
              annotations: [
                ...targetLayer.annotations.map((a) =>
                  a === targetAnnotation ? sourceAnnotation : a
                ),
              ],
            };
          }
          return l;
        }),
      };
    case 'duplicate_compatible':
      if (targetAnnotation) {
        return prevState;
      }
      return {
        ...prevState,
        layers: prevState.layers.map(
          (l): XYLayerConfig =>
            l.layerId === target.layerId
              ? {
                  ...targetLayer,
                  annotations: [
                    ...targetLayer.annotations,
                    createCopiedAnnotation(
                      target.columnId,
                      getStaticDate(getDataLayers(prevState.layers), frame),
                      sourceAnnotation
                    ),
                  ],
                }
              : l
        ),
      };
    case 'replace_duplicate_compatible':
      if (!targetAnnotation) {
        return prevState;
      }
      return {
        ...prevState,
        layers: prevState.layers.map((l) => {
          if (l.layerId === target.layerId) {
            return {
              ...targetLayer,
              annotations: [
                ...targetLayer.annotations.map((a) =>
                  a === targetAnnotation
                    ? createCopiedAnnotation(
                        target.columnId,
                        getStaticDate(getDataLayers(prevState.layers), frame),
                        sourceAnnotation
                      )
                    : a
                ),
              ],
            };
          }
          return l;
        }),
      };
    case 'move_compatible':
      if (targetAnnotation || !sourceAnnotation) {
        return prevState;
      }

      return {
        ...prevState,
        layers: prevState.layers.map((l): XYLayerConfig => {
          if (l.layerId === source.layerId) {
            return {
              ...sourceLayer,
              annotations: sourceLayer.annotations.filter((a) => a !== sourceAnnotation),
            };
          }
          if (l.layerId === target.layerId) {
            return {
              ...targetLayer,
              annotations: [...targetLayer.annotations, sourceAnnotation],
            };
          }
          return l;
        }),
      };
    default:
      return prevState;
  }
};

export const setAnnotationsDimension: Visualization<XYState>['setDimension'] = ({
  prevState,
  layerId,
  columnId,
  previousColumn,
  frame,
}) => {
  const targetLayer = prevState.layers.find((l) => l.layerId === layerId);
  if (!targetLayer || !isAnnotationsLayer(targetLayer)) {
    return prevState;
  }
  const sourceAnnotation = previousColumn
    ? targetLayer.annotations?.find(({ id }) => id === previousColumn)
    : undefined;

  return {
    ...prevState,
    layers: prevState.layers.map((l) =>
      l.layerId === layerId
        ? {
            ...targetLayer,
            annotations: [
              ...targetLayer.annotations,
              createCopiedAnnotation(
                columnId,
                getStaticDate(getDataLayers(prevState.layers), frame),
                sourceAnnotation
              ),
            ],
          }
        : l
    ),
  };
};

export const getAnnotationsAccessorColorConfig = (layer: XYAnnotationLayerConfig) =>
  layer.annotations.map((annotation) => getAnnotationAccessor(annotation));

export const getAnnotationsConfiguration = ({
  state,
  frame,
  layer,
}: {
  state: XYState;
  frame: Pick<FramePublicAPI, 'datasourceLayers'>;
  layer: XYAnnotationLayerConfig;
}) => {
  const groupLabel = getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) });

  return {
    groups: [
      {
        groupId: 'xAnnotations',
        groupLabel,
        dimensionEditorGroupLabel: i18n.translate(
          'xpack.lens.indexPattern.annotationsDimensionEditorLabel',
          {
            defaultMessage: '{groupLabel} annotation',
            values: { groupLabel },
          }
        ),
        accessors: getAnnotationsAccessorColorConfig(layer),
        dataTestSubj: 'lnsXY_xAnnotationsPanel',
        requiredMinDimensionCount: 0,
        supportsMoreColumns: true,
        supportFieldFormat: false,
        enableDimensionEditor: true,
        filterOperations: () => false,
      },
    ],
  };
};

export const getUniqueLabels = (layers: XYLayerConfig[]) => {
  const annotationLayers = getAnnotationsLayers(layers);
  const columnLabelMap = {} as Record<string, string>;

  const uniqueLabelGenerator = getUniqueLabelGenerator();

  annotationLayers.forEach((layer) => {
    if (!layer.annotations) {
      return;
    }
    layer.annotations.forEach((l) => {
      columnLabelMap[l.id] = uniqueLabelGenerator(l.label);
    });
  });
  return columnLabelMap;
};
