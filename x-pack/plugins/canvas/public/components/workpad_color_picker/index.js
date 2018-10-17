/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getWorkpadColors } from '../../state/selectors/workpad';
import { addColor, removeColor } from '../../state/actions/workpad';

import { WorkpadColorPicker as Component } from './workpad_color_picker';

const mapStateToProps = state => ({
  colors: getWorkpadColors(state),
});

const mapDispatchToProps = {
  addColor,
  removeColor,
};

export const WorkpadColorPicker = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component);
