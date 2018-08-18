/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { logPositionActions, logPositionSelectors, sharedSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withTimeControls = connect(
  (state: State) => ({
    currentTime: sharedSelectors.selectVisibleMidpointOrTargetTime(state),
    isLiveStreaming: logPositionSelectors.selectIsAutoReloading(state),
  }),
  bindPlainActionCreators({
    startLiveStreaming: logPositionActions.startAutoReload,
    stopLiveStreaming: logPositionActions.stopAutoReload,
    jumpToTargetPositionTime: logPositionActions.jumpToTargetPositionTime,
  })
);

export const WithTimeControls = asChildFunctionRenderer(withTimeControls);
