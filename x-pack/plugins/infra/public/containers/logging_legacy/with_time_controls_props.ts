/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { isIntervalLoadingPolicy } from '../../utils/loading_state';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import {
  entriesActions,
  entriesSelectors,
  sharedSelectors,
  State,
  targetActions,
} from './state';

export const withTimeControlsProps = connect(
  (state: State) => ({
    currentTime: sharedSelectors.selectVisibleMidpointOrTargetTime(state),
    isLiveStreaming: isIntervalLoadingPolicy(
      entriesSelectors.selectEntriesEndLoadingState(state).policy
    ),
  }),
  bindPlainActionCreators({
    disableLiveStreaming: entriesActions.stopLiveStreaming,
    enableLiveStreaming: entriesActions.startLiveStreaming,
    jumpToTime: targetActions.jumpToTime,
  })
);
