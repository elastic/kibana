/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { routerProvider } from '../../lib/router_provider';
import { getAppState } from '../../lib/app_state';
import { getTimeInterval } from '../../lib/time_interval';
import { CanvasLoading } from './canvas_loading';

export class Router extends React.PureComponent {
  static propTypes = {
    showLoading: PropTypes.bool.isRequired,
    onLoad: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
    routes: PropTypes.array.isRequired,
    loadingMessage: PropTypes.string,
    onRouteChange: PropTypes.func,
    setFullscreen: PropTypes.func.isRequired,
  };

  static childContextTypes = {
    router: PropTypes.object.isRequired,
  };

  state = {
    router: {},
    activeComponent: CanvasLoading,
  };

  getChildContext() {
    const { router } = this.state;
    return { router };
  }

  UNSAFE_componentWillMount() {
    // routerProvider is a singleton, and will only ever return one instance
    const { routes, onRouteChange, onLoad, onError } = this.props;
    const router = routerProvider(routes);
    let firstLoad = true;

    // when the component in the route changes, render it
    router.onPathChange(route => {
      const { pathname } = route.location;
      const { component } = route.meta;

      if (!component) {
        // TODO: render some kind of 404 page, maybe from a prop?
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`No component defined on route: ${route.name}`);
        }

        return;
      }

      // if this is the first load, execute the route
      if (firstLoad) {
        firstLoad = false;

        // execute the route
        router
          .execute()
          .then(() => onLoad())
          .catch(err => onError(err));
      }

      const appState = getAppState();

      if (appState.__fullscreen) {
        this.props.setFullscreen(appState.__fullscreen);
      }

      if (appState.__refreshInterval) {
        this.props.setRefreshInterval(getTimeInterval(appState.__refreshInterval));
      }

      if (!!appState.__autoplayInterval) {
        this.props.enableAutoplay(true);
        this.props.setAutoplayInterval(getTimeInterval(appState.__autoplayInterval));
      }

      // notify upstream handler of route change
      onRouteChange && onRouteChange(pathname);

      this.setState({ activeComponent: component });
    });

    this.setState({ router });
  }

  render() {
    // show loading
    if (this.props.showLoading) {
      return React.createElement(CanvasLoading, { msg: this.props.loadingMessage });
    }

    return <this.state.activeComponent />;
  }
}
