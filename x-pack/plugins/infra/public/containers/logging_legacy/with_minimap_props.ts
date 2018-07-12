/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import {
  entriesSelectors,
  minimapSelectors,
  searchSummarySelectors,
  sharedSelectors,
  State,
  summaryActions,
  summarySelectors,
  targetActions,
} from '../../containers/logging_legacy/state';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withMinimapProps = connect(
  (state: State) => ({
    highlightedInterval: entriesSelectors.selectVisibleEntriesTimeInterval(state),
    loadedInterval: entriesSelectors.selectLoadedEntriesTimeInterval(state),
    scale: minimapSelectors.selectMinimapScale(state),
    searchSummaryBuckets: searchSummarySelectors.selectBuckets(state),
    summaryBuckets: summarySelectors.selectSummaryBuckets(state),
    target: sharedSelectors.selectVisibleMidpointOrTargetTime(state),
  }),
  bindPlainActionCreators({
    jumpToTarget: targetActions.jumpToTarget,
    reportVisibleInterval: summaryActions.reportVisibleSummary,
  })
);
