/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../constants';
import { getApiStatus, getApiError, getSelectedAutoFollowPattern } from '../../store/selectors';
import { getAutoFollowPattern, saveAutoFollowPattern, clearApiError } from '../../store/actions';
import { AutoFollowPatternEdit as AutoFollowPatternEditView } from './auto_follow_pattern_edit';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => ({
  apiStatus: getApiStatus(scope)(state),
  apiError: getApiError(scope)(state),
  autoFollowPattern: getSelectedAutoFollowPattern(state),
});

const mapDispatchToProps = dispatch => ({
  getAutoFollowPattern: (id) => dispatch(getAutoFollowPattern(id)),
  saveAutoFollowPattern: (id, autoFollowPattern) => dispatch(saveAutoFollowPattern(id, autoFollowPattern, true)),
  clearApiError: () => dispatch(clearApiError(scope)),
});

export const AutoFollowPatternEdit = connect(
  mapStateToProps,
  mapDispatchToProps
)(AutoFollowPatternEditView);
