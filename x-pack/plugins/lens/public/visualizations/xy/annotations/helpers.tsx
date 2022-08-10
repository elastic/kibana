/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  isRangeAnnotation,
} from '@kbn/event-annotation-plugin/public';
import { EventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import { IconChartBarAnnotations } from '@kbn/chart-icons';
import { layerTypes } from '../../../../common';
import type { FramePublicAPI, Visualization } from '../../../types';
import { isHorizontalChart } from '../state_helpers';
import type { XYState, XYDataLayerConfig, XYAnnotationLayerConfig, XYLayerConfig } from '../types';
import {
  checkScaleOperation,
  getAnnotationsLayers,
  getAxisName,
  getDataLayers,
  isAnnotationsLayer,
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

  const hasDateHistogram = Boolean(
    dataLayers.length &&
      dataLayers.every(
        (dataLayer) =>
          dataLayer.xAccessor &&
          checkScaleOperation('interval', 'date', frame?.datasourceLayers || {})(dataLayer)
      )
  );
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
    type: layerTypes.ANNOTATIONS,
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

const getDefaultAnnotationConfig = (id: string, timestamp: string): EventAnnotationConfig => ({
  label: defaultAnnotationLabel,
  key: {
    type: 'point_in_time',
    timestamp,
  },
  icon: 'triangle',
  id,
});

const createCopiedAnnotation = (
  newId: string,
  timestamp: string,
  source?: EventAnnotationConfig
): EventAnnotationConfig => {
  if (!source) {
    return getDefaultAnnotationConfig(newId, timestamp);
  }
  return {
    ...source,
    id: newId,
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
  const sourceLayer = prevState.layers.find((l) => l.layerId === source.layerId);
  if (
    !targetLayer ||
    !isAnnotationsLayer(targetLayer) ||
    !sourceLayer ||
    !isAnnotationsLayer(sourceLayer)
  ) {
    return prevState;
  }
  const targetAnnotation = targetLayer.annotations.find(({ id }) => id === target.columnId);
  const sourceAnnotation = sourceLayer.annotations.find(({ id }) => id === source.columnId);
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
  return prevState;
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

export const getSingleColorAnnotationConfig = (annotation: EventAnnotationConfig) => ({
  columnId: annotation.id,
  triggerIcon: annotation.isHidden ? ('invisible' as const) : ('color' as const),
  color:
    annotation?.color ||
    (isRangeAnnotation(annotation) ? defaultAnnotationRangeColor : defaultAnnotationColor),
});

export const getAnnotationsAccessorColorConfig = (layer: XYAnnotationLayerConfig) =>
  layer.annotations.map((annotation) => getSingleColorAnnotationConfig(annotation));

export const getAnnotationsConfiguration = ({
  state,
  frame,
  layer,
}: {
  state: XYState;
  frame: Pick<FramePublicAPI, 'datasourceLayers'>;
  layer: XYAnnotationLayerConfig;
}) => {
  const dataLayers = getDataLayers(state.layers);

  const hasDateHistogram = Boolean(
    dataLayers.length &&
      dataLayers.every(
        (dataLayer) =>
          dataLayer.xAccessor &&
          checkScaleOperation('interval', 'date', frame?.datasourceLayers || {})(dataLayer)
      )
  );

  const groupLabel = getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) });

  const emptyButtonLabels = {
    buttonAriaLabel: i18n.translate('xpack.lens.indexPattern.addColumnAriaLabelClick', {
      defaultMessage: 'Add an annotation to {groupLabel}',
      values: { groupLabel },
    }),
    buttonLabel: i18n.translate('xpack.lens.configure.emptyConfigClick', {
      defaultMessage: 'Add an annotation',
    }),
  };

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
        invalid: !hasDateHistogram,
        invalidMessage: i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabelDisabledHelp', {
          defaultMessage: 'Annotations require a time based chart to work. Add a date histogram.',
        }),
        required: false,
        supportsMoreColumns: true,
        supportFieldFormat: false,
        enableDimensionEditor: true,
        filterOperations: () => false,
        labels: emptyButtonLabels,
      },
    ],
  };
};

export const getUniqueLabels = (layers: XYLayerConfig[]) => {
  const annotationLayers = getAnnotationsLayers(layers);
  const columnLabelMap = {} as Record<string, string>;
  const counts = {} as Record<string, number>;

  const makeUnique = (label: string) => {
    let uniqueLabel = label;

    while (counts[uniqueLabel] >= 0) {
      const num = ++counts[uniqueLabel];
      uniqueLabel = i18n.translate('xpack.lens.uniqueLabel', {
        defaultMessage: '{label} [{num}]',
        values: { label, num },
      });
    }

    counts[uniqueLabel] = 0;
    return uniqueLabel;
  };

  annotationLayers.forEach((layer) => {
    if (!layer.annotations) {
      return;
    }
    layer.annotations.forEach((l) => {
      columnLabelMap[l.id] = makeUnique(l.label);
    });
  });
  return columnLabelMap;
};
