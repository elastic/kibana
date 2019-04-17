/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getColumnIdByIndex, UnknownVisModel, updatePrivateState } from '../..';
import { XyChartPrivateState, XyDisplayType } from './types';

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
  const firstQuery = Object.values(visModel.queries)[0];

  // TODO we maybe need a more stable way to get these
  let xAxisRef: string | undefined;
  let yAxisRef: string | undefined;
  let seriesAxisRef: string | undefined;

  if (firstQuery.select.length === 2) {
    yAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
    xAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);
  }
  if (firstQuery.select.length === 3) {
    seriesAxisRef = getColumnIdByIndex(visModel.queries, 0, 0);
    yAxisRef = getColumnIdByIndex(visModel.queries, 0, 1);
    xAxisRef = getColumnIdByIndex(visModel.queries, 0, 2);
  }

  if (xAxisRef && yAxisRef) {
    return updateXyState(visModel, {
      xAxis: { title: 'X Axis', columns: [xAxisRef] },
      yAxis: { title: 'Y Axis', columns: [yAxisRef] },
      seriesAxis: { title: 'Series Axis', columns: seriesAxisRef ? [seriesAxisRef] : [] },
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
