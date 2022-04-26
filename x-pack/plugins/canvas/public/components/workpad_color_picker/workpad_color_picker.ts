/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { addColor, removeColor } from '../../state/actions/workpad';
import { getWorkpadColors } from '../../state/selectors/workpad';

import { WorkpadColorPicker as Component } from './workpad_color_picker.component';
import { State } from '../../../types';

const mapStateToProps = (state: State) => ({
  colors: getWorkpadColors(state),
});

const mapDispatchToProps = {
  onAddColor: addColor,
  onRemoveColor: removeColor,
};

export const WorkpadColorPicker = connect(mapStateToProps, mapDispatchToProps)(Component);
