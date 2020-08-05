/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../../constants';
import {
  getListAutoFollowPatterns,
  getSelectedAutoFollowPatternId,
  getApiStatus,
  getApiError,
  isApiAuthorized,
} from '../../../store/selectors';
import {
  loadAutoFollowPatterns,
  selectDetailAutoFollowPattern,
  loadAutoFollowStats,
} from '../../../store/actions';
import { AutoFollowPatternList as AutoFollowPatternListView } from './auto_follow_pattern_list';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => ({
  autoFollowPatterns: getListAutoFollowPatterns(state),
  autoFollowPatternId: getSelectedAutoFollowPatternId('detail')(state),
  apiStatus: getApiStatus(scope)(state),
  apiError: getApiError(scope)(state),
  isAuthorized: isApiAuthorized(scope)(state),
});

const mapDispatchToProps = (dispatch) => ({
  loadAutoFollowPatterns: (inBackground) => dispatch(loadAutoFollowPatterns(inBackground)),
  selectAutoFollowPattern: (id) => dispatch(selectDetailAutoFollowPattern(id)),
  loadAutoFollowStats: () => dispatch(loadAutoFollowStats()),
});

export const AutoFollowPatternList = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternListView);
