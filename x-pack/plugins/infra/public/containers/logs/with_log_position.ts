/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { logPositionActions, logPositionSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withLogPosition = connect(
  (state: State) => ({
    firstVisiblePosition: logPositionSelectors.selectFirstVisiblePosition(state),
    isAutoReloading: logPositionSelectors.selectIsAutoReloading(state),
    lastVisiblePosition: logPositionSelectors.selectFirstVisiblePosition(state),
    targetPosition: logPositionSelectors.selectTargetPosition(state),
    visibleTimeInterval: logPositionSelectors.selectVisibleTimeInterval(state),
    visibleMidpoint: logPositionSelectors.selectVisibleMidpointOrTargetTime(state),
  }),
  bindPlainActionCreators({
    jumpToTargetPosition: logPositionActions.jumpToTargetPosition,
    jumpToTargetPositionTime: logPositionActions.jumpToTargetPositionTime,
    reportVisiblePositions: logPositionActions.reportVisiblePositions,
    reportVisibleSummary: logPositionActions.reportVisibleSummary,
    restoreFromUrl: logPositionActions.restoreFromUrl,
    startLiveStreaming: logPositionActions.startAutoReload,
    stopLiveStreaming: logPositionActions.stopAutoReload,
  })
);

export const WithLogPosition = asChildFunctionRenderer(withLogPosition, {
  onInitialize: props =>
    props.restoreFromUrl({
      defaultPositionTime: Date.now(),
    }),
});
