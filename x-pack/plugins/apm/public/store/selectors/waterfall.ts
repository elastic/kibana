/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RRRRenderArgs } from 'react-redux-request';
import { createSelector, ParametricSelector } from 'reselect';
import { TransactionV2 } from '../../../typings/Transaction';
import { WaterfallResponse } from '../../../typings/waterfall';
import { ID as v1ID } from '../reactReduxRequest/waterfallV1';
import { ID as v2ID } from '../reactReduxRequest/waterfallV2';

interface ReduxState {
  reactReduxRequest: {
    [v1ID]?: RRRRenderArgs<WaterfallResponse>;
    [v2ID]?: RRRRenderArgs<WaterfallResponse>;
  };
}

export const selectWaterfall: ParametricSelector<
  ReduxState,
  any,
  WaterfallResponse | null
> = state => {
  const waterfall =
    state.reactReduxRequest[v1ID] || state.reactReduxRequest[v2ID];

  return waterfall && waterfall.data ? waterfall.data : null;
};

export const selectWaterfallRoot = createSelector(
  [selectWaterfall],
  waterfall => {
    if (!waterfall) {
      return;
    }

    return waterfall.hits.find(
      hit => hit.version === 'v2' && !hit.parent
    ) as TransactionV2;
  }
);
