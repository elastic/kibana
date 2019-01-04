/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../../constants';
import {
  getListAutoFollowPatterns,
  getApiStatus,
  getApiError,
  isApiAuthorized,
  isAutoFollowPatternDetailPanelOpen as isDetailPanelOpen,
} from '../../../store/selectors';
import {
  loadAutoFollowPatterns,
  openAutoFollowPatternDetailPanel as openDetailPanel,
  closeAutoFollowPatternDetailPanel as closeDetailPanel,
  loadAutoFollowStats,
} from '../../../store/actions';
import { AutoFollowPatternList as AutoFollowPatternListView } from './auto_follow_pattern_list';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => ({
  autoFollowPatterns: getListAutoFollowPatterns(state),
  apiStatus: getApiStatus(scope)(state),
  apiError: getApiError(scope)(state),
  isAuthorized: isApiAuthorized(scope)(state),
  isDetailPanelOpen: isDetailPanelOpen(state),
});

const mapDispatchToProps = dispatch => ({
  loadAutoFollowPatterns: (inBackground) => dispatch(loadAutoFollowPatterns(inBackground)),
  openDetailPanel: (name) => {
    dispatch(openDetailPanel(name));
  },
  closeDetailPanel: () => {
    dispatch(closeDetailPanel());
  },
  loadAutoFollowStats: () => dispatch(loadAutoFollowStats())
});

export const AutoFollowPatternList = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternListView);
