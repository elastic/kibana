/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';

export class FullscreenControl extends React.PureComponent {
  toggleFullscreen = () => {
    const { setFullscreen, isFullscreen } = this.props;
    setFullscreen(!isFullscreen);
  };

  render() {
    const { children, isFullscreen } = this.props;

    const keyHandler = action => {
      if (action === 'FULLSCREEN' || (isFullscreen && action === 'FULLSCREEN_EXIT')) {
        this.toggleFullscreen();
      }
    };

    return (
      <span>
        <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global isolate />
        {children({ isFullscreen, toggleFullscreen: this.toggleFullscreen })}
      </span>
    );
  }
}

FullscreenControl.propTypes = {
  setFullscreen: PropTypes.func.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  children: PropTypes.func.isRequired,
};
