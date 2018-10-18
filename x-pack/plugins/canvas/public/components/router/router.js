/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { routerProvider } from '../../lib/router_provider';
import { CanvasLoading } from './canvas_loading';

export class Router extends React.PureComponent {
  static childContextTypes = {
    router: PropTypes.object.isRequired,
  };

  static propTypes = {
    showLoading: PropTypes.bool.isRequired,
    onLoad: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
    routes: PropTypes.array.isRequired,
    loadingMessage: PropTypes.string,
    onRouteChange: PropTypes.func,
  };

  static state = {
    router: {},
    activeComponent: CanvasLoading,
  };

  getChildContext() {
    const { router } = this.state;
    return { router };
  }

  componentWillMount() {
    // routerProvider is a singleton, and will only ever return one instance
    const { routes, onRouteChange, onLoad, onError } = this.props;
    const router = routerProvider(routes);

    // when the component in the route changes, render it
    router.onPathChange(route => {
      const { pathname } = route.location;
      const firstLoad = !this.state;
      const { component } = route.meta;

      if (!component) {
        // TODO: render some kind of 404 page, maybe from a prop?
        if (process.env.NODE_ENV !== 'production')
          console.warn(`No component defined on route: ${route.name}`);

        return;
      }

      // if this is the first load, execute the route
      if (firstLoad) {
        router
          .execute()
          .then(() => onLoad())
          .catch(err => onError(err));
      }

      // notify upstream handler of route change
      onRouteChange && onRouteChange(pathname);

      this.setState({ activeComponent: component });
    });

    this.setState({ router });
  }

  render() {
    if (this.props.showLoading)
      return React.createElement(CanvasLoading, { msg: this.props.loadingMessage });

    return React.createElement(this.state.activeComponent, {});
  }
}
