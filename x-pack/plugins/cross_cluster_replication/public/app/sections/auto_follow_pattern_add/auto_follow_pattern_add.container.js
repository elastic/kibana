/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../constants';
import { getApiStatus, getApiError } from '../../store/selectors';
import { createAutoFollowPattern, clearApiError } from '../../store/actions';
import { AutoFollowPatternAdd as AutoFollowPatternAddView } from './auto_follow_pattern_add';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => ({
  apiStatus: getApiStatus(scope)(state),
  apiError: getApiError(scope)(state),
});

const mapDispatchToProps = dispatch => ({
  createAutoFollowPattern: (id, autoFollowPattern) => dispatch(createAutoFollowPattern(id, autoFollowPattern)),
  clearApiError: () => dispatch(clearApiError(scope)),
});

export const AutoFollowPatternAdd = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternAddView);
