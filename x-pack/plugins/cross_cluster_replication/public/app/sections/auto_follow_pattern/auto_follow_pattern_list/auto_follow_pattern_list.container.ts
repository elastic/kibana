/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { AutoFollowPatternActions as a } from '../../../store/actions';

import { AutoFollowPatternList as AutoFollowPatternListView } from './auto_follow_pattern_list';

const mapDispatchToProps = (dispatch: Dispatch) => ({
  loadAutoFollowPatterns: () => dispatch(a.loadAutoFollowPatterns()),
});

export const AutoFollowPatternList = connect(
  null,
  mapDispatchToProps
)(AutoFollowPatternListView);
