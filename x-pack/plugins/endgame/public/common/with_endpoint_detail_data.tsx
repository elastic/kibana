/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, ComponentType } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { EndgameAppContext } from './app_context';

/**
 * Creates a higher order component around the given component on input and passes a prop named
 * `endpoint` when that component is rendered. `endpoint` is an `object` (or `null`) containing
 * the information about the given endpoint.
 * The higher order component needs to be given the props from the `react-router-dom` `Route`
 * match - specifically `props.match.params.id` should be the ID of the endpoint to be retrieved.
 *
 * @param {ComponentType} C
 *
 * @example
 *
 * const TestComponent = withEndpointDetailData(function({endpoint}){
 *   return endpointData ?
 *    (<div>{JSON.stringify(endpoint, null, 4)}</div>) :
 *    (<div>no endpoint data yet</div>);
 * })
 * //
 * //.... somewhere else
 * //
 * <Route path="/endpoint/view/:id" exact component={TestComponent} />
 */
export function withEndpointDetailData<P extends { endpoint: null | object } & RouteComponentProps>(
  C: ComponentType<P>
) {
  return class ComponentWithEndpointsData extends PureComponent<P, { endpoint: null | object }> {
    static contextType = EndgameAppContext;

    context!: React.ContextType<typeof EndgameAppContext>;

    state = {
      endpoint: null,
    };

    render() {
      const { children, ...props } = this.props;

      return (
        // FIXME: need help on this.... What am I missing in the TS generic to avoid this error?
        <C {...props} endpoint={this.state.endpoint}>
          {children}
        </C>
      );
    }

    async componentDidMount() {
      // Load some API data for this component
      const endpoint = await this.context.appContext.core.http
        // FIXME: need help fixing issue below with `id` and TS validation
        .get(`${this.context.apiPrefixPath}/endpoints2/${this.props.match.params.id}`)
        .catch((e: Error) => {
          console.error(e); //eslint-disable-line
          return Promise.resolve([]);
        });
      this.setState({ endpoint });
    }
  };
}
