/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OperationVariables } from 'apollo-client';
import { GraphQLError } from 'graphql';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { withApollo, WithApolloClient } from 'react-apollo';
import { formatUptimeGraphQLErrorList } from '../../lib/helper/format_error_list';
import { UptimeRefreshContext } from '../../contexts';

export interface UptimeGraphQLQueryProps<T> {
  loading: boolean;
  data?: T;
  errors?: GraphQLError[];
}

interface UptimeGraphQLProps {
  implementsCustomErrorState?: boolean;
  variables: OperationVariables;
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

  return withApollo((props: Props) => {
    const { lastRefresh } = useContext(UptimeRefreshContext);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<T | undefined>(undefined);
    const [errors, setErrors] = useState<GraphQLError[] | undefined>(undefined);
    const { client, implementsCustomErrorState, variables } = props;
    const fetch = () => {
      setLoading(true);
      client.query<T>({ fetchPolicy: 'network-only', query, variables }).then((result: any) => {
        setData(result.data);
        setLoading(result.loading);
        setErrors(result.errors);
      });
    };
    useEffect(
      () => {
        fetch();
      },
      [variables, lastRefresh]
    );
    if (!implementsCustomErrorState && errors && errors.length > 0) {
      return <Fragment>{formatUptimeGraphQLErrorList(errors)}</Fragment>;
    }
    return <WrappedComponent {...props} loading={loading} data={data} errors={errors} />;
  });
}
