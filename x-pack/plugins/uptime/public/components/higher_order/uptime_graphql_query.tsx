/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OperationVariables } from 'apollo-client';
import { GraphQLError } from 'graphql';
import React from 'react';
import { withApollo, WithApolloClient } from 'react-apollo';

export interface UptimeGraphQLQueryProps<T> {
  loading: boolean;
  data?: T;
  errors?: GraphQLError[];
}

interface UptimeGraphQLProps {
  registerWatch: (handler: () => void) => void;
  variables: OperationVariables;
}

interface State<T> {
  loading: boolean;
  data?: T;
  errors?: GraphQLError[];
}

/**
 * This HOC abstracts the task of querying our GraphQL endpoint,
 * which eliminates the need for a lot of boilerplate code in the other components.
 *
 * @type T - the expected result's type
 * @param WrappedComponent - the consuming component
 * @param query - the graphQL query
 */
export function withUptimeGraphQL<T>(WrappedComponent: any, query: any) {
  return withApollo(
    class UptimeGraphQLQuery extends React.Component<
      UptimeGraphQLProps & WithApolloClient<T>,
      State<T>
    > {
      constructor(props: UptimeGraphQLProps & WithApolloClient<T>) {
        super(props);
        this.state = {
          loading: true,
        };
      }

      public render() {
        return <WrappedComponent {...this.state} {...this.props} />;
      }

      public componentDidMount() {
        this.fetch();
        this.props.registerWatch(this.fetch);
      }

      private fetch = async () => {
        const { client, variables } = this.props;
        this.setState({ loading: true }, () =>
          client
            .query<T>({ fetchPolicy: 'network-only', query, variables })
            .then(({ data, loading, errors }) => {
              this.setState({
                data,
                loading,
                errors,
              });
            })
        );
      };
    }
  );
}
