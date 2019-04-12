/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getColumnIdByIndex, UnknownVisModel, updatePrivateState } from '../..';
import { XyChartPrivateState, XyChartVisModel, XyDisplayType } from './types';

export const updateXyState = updatePrivateState<'xyChart', XyChartPrivateState>('xyChart');

export function removePrivateState(visModel: UnknownVisModel) {
  return {
    ...visModel,
    private: {
      ...visModel.private,
      xyChart: undefined,
    },
  };
}

export function prefillPrivateState(visModel: UnknownVisModel, displayType?: XyDisplayType) {
  if (visModel.private.xyChart) {
    if (displayType) {
      return updateXyState(visModel, { displayType });
    } else {
      return visModel as XyChartVisModel;
    }
  }

  // TODO we maybe need a more stable way to get these
  const xAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);
  const yAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
  // TODO check whether we have a split series candidate

  if (xAxisRef && yAxisRef) {
    return updateXyState(visModel, {
      xAxis: { title: 'X Axis', columns: [xAxisRef] },
      yAxis: { title: 'Y Axis', columns: [yAxisRef] },
      seriesAxis: { title: 'Series Axis', columns: [] },
      displayType: displayType || 'line',
    });
  } else {
    return updateXyState(visModel, {
      xAxis: { title: 'X Axis', columns: [] },
      yAxis: { title: 'Y Axis', columns: [] },
      seriesAxis: { title: 'Series Axis', columns: [] },
      displayType: displayType || 'line',
    });
  }
}
