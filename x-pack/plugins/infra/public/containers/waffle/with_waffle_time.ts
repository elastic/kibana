/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { State, waffleTimeActions, waffleTimeSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withWaffleTime = connect(
  (state: State) => ({
    currentTime: waffleTimeSelectors.selectCurrentTime(state),
    currentTimeRange: waffleTimeSelectors.selectCurrentTimeRange(state),
    isAutoReloading: waffleTimeSelectors.selectIsAutoReloading(state),
  }),
  bindPlainActionCreators({
    jumpToTime: waffleTimeActions.jumpToTime,
    startAutoReload: waffleTimeActions.startAutoReload,
    stopAutoReload: waffleTimeActions.stopAutoReload,
  })
);

export const WithWaffleTime = asChildFunctionRenderer(withWaffleTime);
