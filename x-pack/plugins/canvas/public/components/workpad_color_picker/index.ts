/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
// @ts-ignore
import { addColor, removeColor } from '../../state/actions/workpad';
// @ts-ignore
import { getWorkpadColors } from '../../state/selectors/workpad';

import { WorkpadColorPicker as Component } from '../workpad_color_picker/workpad_color_picker';

export interface State {
  colors: string[];
}

const mapStateToProps = (state: State) => ({
  colors: getWorkpadColors(state),
});

const mapDispatchToProps = {
  onAddColor: addColor,
  onRemoveColor: removeColor,
};

export const WorkpadColorPicker = connect(
  mapStateToProps,
  mapDispatchToProps
)(Component);
