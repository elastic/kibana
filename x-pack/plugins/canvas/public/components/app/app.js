/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { routes } from '../../apps';
import { shortcutManager } from '../../lib/shortcut_manager';
import { getWindow } from '../../lib/get_window';
import { Router } from '../router';

export class App extends React.PureComponent {
  static childContextTypes = {
    shortcuts: PropTypes.object.isRequired,
  };

  static propTypes = {
    appState: PropTypes.object.isRequired,
    setAppReady: PropTypes.func.isRequired,
    setAppError: PropTypes.func.isRequired,
    onRouteChange: PropTypes.func.isRequired,
  };

  getChildContext() {
    return { shortcuts: shortcutManager };
  }

  componentDidMount() {
    const win = getWindow();
    win.canvasInitErrorHandler && win.canvasInitErrorHandler();
  }

  componentWillUnmount() {
    const win = getWindow();
    win.canvasRestoreErrorHandler && win.canvasRestoreErrorHandler();
  }

  renderError = () => {
    console.error(this.props.appState);

    return (
      <div>
        <div>Canvas failed to load :(</div>
        <div>Message: {this.props.appState.message}</div>
      </div>
    );
  };

  render() {
    if (this.props.appState instanceof Error) return this.renderError();

    return (
      <div className="canvas canvasContainer">
        <Router
          routes={routes}
          showLoading={this.props.appState.ready === false}
          loadingMessage="Canvas is loading"
          onRouteChange={this.props.onRouteChange}
          onLoad={() => this.props.setAppReady(true)}
          onError={err => this.props.setAppError(err)}
        />
      </div>
    );
  }
}
