/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { sharedSelectors, State, targetActions, targetSelectors } from './state';

export const withTimeControls = connect(
  (state: State) => ({
    currentTime: sharedSelectors.selectVisibleMidpointOrTargetTime(state),
    isLiveStreaming: targetSelectors.selectIsAutoReloading(state),
  }),
  bindPlainActionCreators({
    startLiveStreaming: targetActions.startAutoReload,
    stopLiveStreaming: targetActions.stopAutoReload,
    jumpToTargetPositionTime: targetActions.jumpToTargetPositionTime,
  })
);

export const WithTimeControls = asChildFunctionRenderer(withTimeControls);
