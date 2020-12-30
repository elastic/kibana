/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import { getWindow } from '../../lib/get_window';

export class Fullscreen extends React.Component {
  static propTypes = {
    isFullscreen: PropTypes.bool,
    children: PropTypes.func,
  };

  state = {
    width: 0,
    height: 0,
  };

  UNSAFE_componentWillMount() {
    this.win = getWindow();
    this.setState({
      width: this.win.innerWidth,
      height: this.win.innerHeight,
    });
  }

  componentDidMount() {
    this.win.addEventListener('resize', this.onWindowResize);
  }

  componentWillUnmount() {
    this.win.removeEventListener('resize', this.onWindowResize);
  }

  getWindowSize = () => ({
    width: this.win.innerWidth,
    height: this.win.innerHeight,
  });

  onWindowResize = debounce(() => {
    const { width, height } = this.getWindowSize();
    this.setState({ width, height });
  }, 100);

  render() {
    const { isFullscreen, children } = this.props;
    const windowSize = {
      width: this.state.width,
      height: this.state.height,
    };

    return children({ isFullscreen, windowSize });
  }
}
