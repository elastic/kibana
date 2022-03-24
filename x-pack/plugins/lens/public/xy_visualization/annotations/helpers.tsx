/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { layerTypes } from '../../../common';
import type {
  XYDataLayerConfig,
  XYAnnotationLayerConfig,
  XYLayerConfig,
} from '../../../common/expressions';
import type { FramePublicAPI, Visualization } from '../../types';
import { isHorizontalChart } from '../state_helpers';
import type { XYState } from '../types';
import {
  checkScaleOperation,
  getAnnotationsLayers,
  getAxisName,
  getDataLayers,
  isAnnotationsLayer,
} from '../visualization_helpers';
import { LensIconChartBarAnnotations } from '../../assets/chart_bar_annotations';
import { generateId } from '../../id_generator';
import { defaultAnnotationColor } from '../../../../../../src/plugins/event_annotation/public';
import { defaultAnnotationLabel } from './config_panel';

const MAX_DATE = 8640000000000000;
const MIN_DATE = -8640000000000000;

export function getStaticDate(
  dataLayers: XYDataLayerConfig[],
  activeData: FramePublicAPI['activeData']
) {
  const fallbackValue = moment().toISOString();

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
  return moment(middleDate).toISOString();
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
    icon: LensIconChartBarAnnotations,
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

  const hasConfig = newLayer.annotations?.some(({ id }) => id === columnId);
  const previousConfig = previousColumn
    ? newLayer.annotations?.find(({ id }) => id === previousColumn)
    : false;
  if (!hasConfig) {
    const newTimestamp = getStaticDate(dataLayers, frame?.activeData);
    newLayer.annotations = [
      ...(newLayer.annotations || []),
      {
        label: defaultAnnotationLabel,
        key: {
          type: 'point_in_time',
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
  return layer.annotations.map((annotation) => {
    return {
      columnId: annotation.id,
      triggerIcon: annotation.isHidden ? ('invisible' as const) : ('color' as const),
      color: annotation?.color || defaultAnnotationColor,
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
