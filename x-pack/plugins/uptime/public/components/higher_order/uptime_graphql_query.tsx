/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OperationVariables } from 'apollo-client';
import { GraphQLError } from 'graphql';
import React from 'react';
import { withApollo, WithApolloClient } from 'react-apollo';
import { formatUptimeGraphQLErrorList } from '../../lib/helper/format_error_list';

export interface UptimeGraphQLQueryProps<T> {
  loading: boolean;
  data?: T;
  errors?: GraphQLError[];
}

interface UptimeGraphQLProps {
  implementsCustomErrorState?: boolean;
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
 * @type P - any props the wrapped component will require
 * @param WrappedComponent - the consuming component
 * @param query - the graphQL query
 */
export function withUptimeGraphQL<T, P = {}>(WrappedComponent: any, query: any) {
  type Props = UptimeGraphQLProps & WithApolloClient<T> & P;
  return withApollo(
    class UptimeGraphQLQuery extends React.Component<Props, State<T>> {
      constructor(props: Props) {
        super(props);
        this.state = {
          loading: true,
        };
      }

      public render() {
        const { errors } = this.state;
        if (!this.props.implementsCustomErrorState && errors && errors.length > 0) {
          return formatUptimeGraphQLErrorList(errors);
        }
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
