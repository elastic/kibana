/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../../constants';
import { getApiStatus, getApiError } from '../../../store/selectors';
import { loadAutoFollowPatterns } from '../../../store/actions';

import { AutoFollowPatternList as AutoFollowPatternListView } from './auto_follow_pattern_list';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => ({
  apiStatus: getApiStatus(scope)(state),
  apiError: getApiError(scope)(state),
});

const mapDispatchToProps = dispatch => ({
  loadAutoFollowPatterns: () => dispatch(loadAutoFollowPatterns()),
});

export const AutoFollowPatternList = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternListView);
