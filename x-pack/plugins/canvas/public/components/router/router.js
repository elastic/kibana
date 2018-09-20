/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { isClassComponent } from 'recompose';
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
    historyInFlight: PropTypes.bool.isRequired,
    loadingMessage: PropTypes.string,
    onRouteChange: PropTypes.func,
  };

  state = {
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
    router.onPathChange(async route => {
      const firstLoad = !this.activeComponent;
      const { pathname } = route.location;
      const { component } = route.meta;

      if (!component) {
        // TODO: render some kind of 404 page, maybe from a prop?
        if (process.env.NODE_ENV !== 'production')
          console.warn(`No component defined on route: ${route.name}`);

        return;
      }

      // call action the first time, the history middleware will handle it afterwards
      if (firstLoad) {
        try {
          await router.execute();
          this.setState({ activeComponent: component });
          onLoad(); // notify consumer that the route is rendered
        } catch (err) {
          onError(err);
          return; // stop the rest of the handler from executing
        }
      }

      // notify upstream handler of route change
      onRouteChange && onRouteChange(pathname);

      // keep track of active component while waiting for in-flight history to resolve
      this.activeComponent = component;

      // attempt to render the new component
      this.renderActiveComponent();
    });

    this.setState({ router });
  }

  componentWillReceiveProps({ historyInFlight }) {
    // attempt to render active component when history in-flight changes
    if (historyInFlight !== this.props.historyInFlight) this.renderActiveComponent();
  }

  renderActiveComponent = () => {
    if (this.props.historyInFlight) return;
    this.setState(state => {
      // update the active component, but only if it has changed (avoid needless re-renders)
      if (state.activeComponent !== this.activeComponent)
        return { activeComponent: this.activeComponent };
    });
  };

  render() {
    // show loading
    if (this.props.showLoading)
      return React.createElement(CanvasLoading, { msg: this.props.loadingMessage });

    // show the activeComponent
    return isClassComponent(this.state.activeComponent)
      ? React.createElement(this.state.activeComponent, {})
      : this.state.activeComponent({});
  }
}
