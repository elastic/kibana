/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, ComponentType } from 'react';
import { EndgameAppContext } from './app_context';

/**
 * Creates a higher order component around the given component on input and passes a prop named
 * `endpoints` when that component is rendered. `endpoints` is an `array<Object>` containing
 * the list of endpoints.
 *
 * @param {ComponentType} C
 */
export function withEndPointsListData<P extends { endpoints: object[] }>(C: ComponentType<P>) {
  return class ComponentWithEndpointsData extends PureComponent<P, { endpoints: object[] }> {
    static contextType = EndgameAppContext;

    context!: React.ContextType<typeof EndgameAppContext>;

    state = {
      endpoints: [],
    };

    render() {
      const { children, ...props } = this.props;

      return (
        // FIXME: need help on this.... What am I missing in the TS generic to avoid this error?
        <C {...props} endpoints={this.state.endpoints}>
          {children}
        </C>
      );
    }

    async componentDidMount() {
      // Load some API data for this component
      const endpoints = await this.context.appContext.core.http
        .get(`${this.context.apiPrefixPath}/endpoints2`)
        .catch((e: Error) => {
          console.error(e); //eslint-disable-line
          return Promise.resolve({ hits: { hits: [] } });
        });

      this.setState({ endpoints: endpoints.hits.hits });
    }
  };
}
