/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getIsDarkTheme, updateIsDarkTheme } from '../../store/ui';
import { OptionsMenu } from './options_menu';

function mapStateToProps(state = {}) {
  return {
    isDarkTheme: getIsDarkTheme(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onDarkThemeChange: (isDarkTheme) => {
      dispatch(updateIsDarkTheme(isDarkTheme));
    },
  };
}

const connectedOptionsMenu = connect(mapStateToProps, mapDispatchToProps)(OptionsMenu);
export { connectedOptionsMenu as OptionsMenu };
