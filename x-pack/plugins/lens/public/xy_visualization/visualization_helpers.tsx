/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DatasourcePublicAPI } from '../types';
import { XYState } from './types';
import { isHorizontalChart } from './state_helpers';
import { XYLayerConfig } from '../../common/expressions';

export function getAxisName(
  axis: 'x' | 'y' | 'yLeft' | 'yRight',
  { isHorizontal }: { isHorizontal: boolean }
) {
  const vertical = i18n.translate('xpack.lens.xyChart.verticalAxisLabel', {
    defaultMessage: 'Vertical axis',
  });
  const horizontal = i18n.translate('xpack.lens.xyChart.horizontalAxisLabel', {
    defaultMessage: 'Horizontal axis',
  });
  if (axis === 'x') {
    return isHorizontal ? vertical : horizontal;
  }
  if (axis === 'y') {
    return isHorizontal ? horizontal : vertical;
  }
  const verticalLeft = i18n.translate('xpack.lens.xyChart.verticalLeftAxisLabel', {
    defaultMessage: 'Vertical left axis',
  });
  const verticalRight = i18n.translate('xpack.lens.xyChart.verticalRightAxisLabel', {
    defaultMessage: 'Vertical right axis',
  });
  const horizontalTop = i18n.translate('xpack.lens.xyChart.horizontalLeftAxisLabel', {
    defaultMessage: 'Horizontal top axis',
  });
  const horizontalBottom = i18n.translate('xpack.lens.xyChart.horizontalRightAxisLabel', {
    defaultMessage: 'Horizontal bottom axis',
  });
  if (axis === 'yLeft') {
    return isHorizontal ? horizontalBottom : verticalLeft;
  }
  return isHorizontal ? horizontalTop : verticalRight;
}

// min requirement for the bug:
// * 2 or more layers
// * at least one with date histogram
// * at least one with interval function
export function checkXAccessorCompatibility(
  state: XYState,
  datasourceLayers: Record<string, DatasourcePublicAPI>
) {
  const errors = [];
  const hasDateHistogramSet = state.layers.some(
    checkScaleOperation('interval', 'date', datasourceLayers)
  );
  const hasNumberHistogram = state.layers.some(
    checkScaleOperation('interval', 'number', datasourceLayers)
  );
  const hasOrdinalAxis = state.layers.some(
    checkScaleOperation('ordinal', undefined, datasourceLayers)
  );
  if (state.layers.length > 1 && hasDateHistogramSet && hasNumberHistogram) {
    errors.push({
      shortMessage: i18n.translate('xpack.lens.xyVisualization.dataTypeFailureXShort', {
        defaultMessage: `Wrong data type for {axis}.`,
        values: {
          axis: getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) }),
        },
      }),
      longMessage: i18n.translate('xpack.lens.xyVisualization.dataTypeFailureXLong', {
        defaultMessage: `Data type mismatch for the {axis}. Cannot mix date and number interval types.`,
        values: {
          axis: getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) }),
        },
      }),
    });
  }
  if (state.layers.length > 1 && (hasDateHistogramSet || hasNumberHistogram) && hasOrdinalAxis) {
    errors.push({
      shortMessage: i18n.translate('xpack.lens.xyVisualization.dataTypeFailureXShort', {
        defaultMessage: `Wrong data type for {axis}.`,
        values: {
          axis: getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) }),
        },
      }),
      longMessage: i18n.translate('xpack.lens.xyVisualization.dataTypeFailureXOrdinalLong', {
        defaultMessage: `Data type mismatch for the {axis}, use a different function.`,
        values: {
          axis: getAxisName('x', { isHorizontal: isHorizontalChart(state.layers) }),
        },
      }),
    });
  }
  return errors;
}

export function checkScaleOperation(
  scaleType: 'ordinal' | 'interval' | 'ratio',
  dataType: 'date' | 'number' | 'string' | undefined,
  datasourceLayers: Record<string, DatasourcePublicAPI>
) {
  return (layer: XYLayerConfig) => {
    const datasourceAPI = datasourceLayers[layer.layerId];
    if (!layer.xAccessor) {
      return false;
    }
    const operation = datasourceAPI?.getOperationForColumnId(layer.xAccessor);
    return Boolean(
      operation && (!dataType || operation.dataType === dataType) && operation.scale === scaleType
    );
  };
}
