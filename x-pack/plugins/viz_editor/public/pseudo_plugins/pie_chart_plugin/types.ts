/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Axis, UnknownVisModel, updatePrivateState, VisModel } from '../..';

export const PLUGIN_NAME = 'pie_chart';

export interface PieChartPrivateState {
  sliceAxis: Axis;
  angleAxis: Axis;
}

export type PieChartVisModel = VisModel<'pieChart', PieChartPrivateState>;

export const updatePieState = updatePrivateState<'pieChart', PieChartPrivateState>('pieChart');

export function removePrivateState(visModel: UnknownVisModel) {
  return {
    ...visModel,
    private: {
      ...visModel.private,
      pieChart: undefined,
    },
  };
}
