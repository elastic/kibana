/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { selectAutoFollowPattern } from '../../../../../store/actions';
import { AutoFollowPatternTable as AutoFollowPatternTableComponent } from './auto_follow_pattern_table';

const mapDispatchToProps = (dispatch) => ({
  selectAutoFollowPattern: (name) => dispatch(selectAutoFollowPattern(name)),
});

export const AutoFollowPatternTable = connect(
  null,
  mapDispatchToProps,
)(AutoFollowPatternTableComponent);
