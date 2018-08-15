/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ColorPicker } from './view';

function mapDispatchToProps(dispatch, { resetColor, changeColor }) {
  return {
    resetColor: () => resetColor && dispatch(resetColor) ||
      console.log('reset color function not implemented/provided'),
    changeColor: color => changeColor && dispatch(changeColor(color)) ||
      console.log(`change color function not implemented/provided. ${color}`)
  };
}

function mapStateToProps(state = {}, { currentColor = '#ffffff' }) {
  return {
    currentColor
  };
}

const connectedColorPicker = connect(mapStateToProps, mapDispatchToProps)(ColorPicker);
export { connectedColorPicker as ColorPicker };
