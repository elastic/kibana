/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LayerAction, StateSetter } from '../../../types';
import type { XYState, XYAnnotationLayerConfig } from '../types';

export const createAnnotationActions = ({
  state,
  layer,
  layerIndex,
  setState,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
}): LayerAction[] => {
  const label = !layer.ignoreGlobalFilters
    ? i18n.translate('xpack.lens.xyChart.annotations.ignoreGlobalFiltersLabel', {
        defaultMessage: 'Ignore global filters',
      })
    : i18n.translate('xpack.lens.xyChart.annotations.keepGlobalFiltersLabel', {
        defaultMessage: 'Keep global filters',
      });
  return [
    {
      displayName: label,
      description: !layer.ignoreGlobalFilters
        ? i18n.translate('xpack.lens.xyChart.annotations.ignoreGlobalFiltersDescription', {
            defaultMessage:
              'All the dimensions configured in this layer ignore filters defined at kibana level.',
          })
        : i18n.translate('xpack.lens.xyChart.annotations.keepGlobalFiltersDescription', {
            defaultMessage:
              'All the dimensions configured in this layer respect filters defined at kibana level.',
          }),
      execute: () => {
        const newLayers = [...state.layers];
        newLayers[layerIndex] = { ...layer, ignoreGlobalFilters: !layer.ignoreGlobalFilters };
        return setState({ ...state, layers: newLayers });
      },
      icon: !layer.ignoreGlobalFilters ? 'eyeClosed' : 'eye',
      isCompatible: true,
      'data-test-subj': !layer.ignoreGlobalFilters
        ? 'lnsXY_annotationLayer_ignoreFilters'
        : 'lnsXY_annotationLayer_keepFilters',
    },
  ];
};
