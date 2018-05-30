/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { isIntervalLoadingPolicy } from '../../utils/loading_state';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { entriesActions, entriesSelectors, State } from './state';

export const withLiveStreamControlsProps = connect(
  (state: State) => ({
    isLiveStreaming: isIntervalLoadingPolicy(
      entriesSelectors.selectEntriesEndLoadingState(state).policy
    ),
  }),
  bindPlainActionCreators({
    disableLiveStreaming: entriesActions.stopLiveStreaming,
    enableLiveStreaming: entriesActions.startLiveStreaming,
  })
);
