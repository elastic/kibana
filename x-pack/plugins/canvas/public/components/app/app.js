/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { routes } from '../../apps';
import { shortcutManager } from '../../lib/shortcut_manager';
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

  renderError = () => {
    console.error(this.props.appState);

    return (
      <div>
        <div>
          <FormattedMessage
            id="xpack.canvas.app.canvasLoadFailTitle"
            defaultMessage="Canvas failed to load :("
          />
        </div>
        <div>
          <FormattedMessage
            id="xpack.canvas.app.canvasLoadFailDescription"
            defaultMessage="Message: {message}"
            values={{ message: this.props.appState.message }}
          />
        </div>
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
          loadingMessage={
            <FormattedMessage
              id="xpack.canvas..app.canvasLoadingTitle"
              defaultMessage="Canvas is loading"
            />
          }
          onRouteChange={this.props.onRouteChange}
          onLoad={() => this.props.setAppReady(true)}
          onError={err => this.props.setAppError(err)}
        />
      </div>
    );
  }
}
