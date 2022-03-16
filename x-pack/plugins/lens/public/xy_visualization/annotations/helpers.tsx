/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { layerTypes } from '../../../common';
import type { XYDataLayerConfig, XYAnnotationLayerConfig } from '../../../common/expressions';
import type { FramePublicAPI, Visualization } from '../../types';
import { isHorizontalChart } from '../state_helpers';
import type { XYState } from '../types';
import {
  checkScaleOperation,
  getAxisName,
  getDataLayers,
  isAnnotationsLayer,
} from '../visualization_helpers';
import { LensIconChartBarAnnotations } from '../../assets/chart_bar_annotations';
import { generateId } from '../../id_generator';
import { defaultAnnotationColor } from '../../../../../../src/plugins/event_annotation/public';

const MAX_DATE = Number(new Date(8640000000000000));
const MIN_DATE = Number(new Date(-8640000000000000));

export function getStaticDate(
  dataLayers: XYDataLayerConfig[],
  activeData: FramePublicAPI['activeData']
) {
  const fallbackValue = +new Date(Date.now());

  const dataLayersId = dataLayers.map(({ layerId }) => layerId);
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
  return middleDate;
}

export const getAnnotationsSupportedLayer = (
  state?: XYState,
  frame?: Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>
) => {
  const dataLayers = getDataLayers(state?.layers || []);

  const hasDateHistogram = dataLayers.every(
    (dataLayer) =>
      dataLayer.xAccessor &&
      checkScaleOperation('interval', 'date', frame?.datasourceLayers || {})(dataLayer)
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
    icon: LensIconChartBarAnnotations,
    disabled: !hasDateHistogram,
    toolTipContent: !hasDateHistogram
      ? i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabelDisabledHelp', {
          defaultMessage: 'Annotations require a time based chart to work. Add a date histogram.',
        })
      : undefined,
    initialDimensions,
  };
};

export const setAnnotationsDimension: Visualization<XYState>['setDimension'] = ({
  prevState,
  layerId,
  columnId,
  previousColumn,
  frame,
}) => {
  const foundLayer = prevState.layers.find((l) => l.layerId === layerId);
  if (!foundLayer || !isAnnotationsLayer(foundLayer)) {
    return prevState;
  }
  const dataLayers = getDataLayers(prevState.layers);
  const newLayer = { ...foundLayer } as XYAnnotationLayerConfig;

  const hasConfig = newLayer.config?.some(({ id }) => id === columnId);
  const previousConfig = previousColumn
    ? newLayer.config?.find(({ id }) => id === previousColumn)
    : false;
  if (!hasConfig) {
    const newTimestamp = getStaticDate(dataLayers, frame?.activeData);
    newLayer.config = [
      ...(newLayer.config || []),
      {
        label: i18n.translate('xpack.lens.xyChart.defaultAnnotationLabel', {
          defaultMessage: 'Static Annotation',
        }),
        annotationType: 'manual',
        axisMode: 'bottom',
        key: {
          keyType: 'point_in_time',
          type: 'annotation_key',
          timestamp: newTimestamp,
        },
        icon: 'triangle',
        ...previousConfig,
        id: columnId,
      },
    ];
  }
  return {
    ...prevState,
    layers: prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
  };
};

export const getAnnotationsAccessorColorConfig = (layer: XYAnnotationLayerConfig) => {
  return layer.config.map((config) => {
    return {
      columnId: config.id,
      triggerIcon: config.isHidden ? ('invisible' as const) : ('color' as const),
      color: config?.color || defaultAnnotationColor,
    };
  });
};

export const getAnnotationsConfiguration = ({
  state,
  frame,
  layer,
}: {
  state: XYState;
  frame: FramePublicAPI;
  layer: XYAnnotationLayerConfig;
}) => {
  const dataLayers = getDataLayers(state.layers);

  const hasDateHistogram = dataLayers.every(
    (dataLayer) =>
      dataLayer.xAccessor &&
      checkScaleOperation('interval', 'date', frame?.datasourceLayers || {})(dataLayer)
  );
  return {
    noDatasource: true,
    groups: [
      {
        groupId: 'xAnnotations',
        groupLabel: getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) }),
        accessors: getAnnotationsAccessorColorConfig(layer),
        dataTestSubj: 'lnsXY_xAnnotationsPanel',
        invalid: !hasDateHistogram,
        invalidMessage: i18n.translate('xpack.lens.xyChart.addAnnotationsLayerLabelDisabledHelp', {
          defaultMessage: 'Annotations require a time based chart to work. Add a date histogram.',
        }),
        required: false,
        requiresPreviousColumnOnDuplicate: true,
        supportsMoreColumns: true,
        supportFieldFormat: false,
        enableDimensionEditor: true,
        filterOperations: () => false,
      },
    ],
  };
};
