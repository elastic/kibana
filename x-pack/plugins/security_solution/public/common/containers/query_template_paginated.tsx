/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApolloQueryResult, NetworkStatus } from 'apollo-client';
import memoizeOne from 'memoize-one';
import React from 'react';
import { FetchMoreOptions, FetchMoreQueryOptions, OperationVariables } from 'react-apollo';
import deepEqual from 'fast-deep-equal';

import { ESQuery } from '../../../common/typed_json';
import { inputsModel } from '../store/model';
import { generateTablePaginationOptions } from '../components/paginated_table/helpers';
import { DocValueFields } from './source';

export { DocValueFields };

export interface QueryTemplatePaginatedProps {
  docValueFields?: DocValueFields[];
  id?: string;
  endDate?: string;
  filterQuery?: ESQuery | string;
  skip?: boolean;
  sourceId: string;
  startDate?: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchMoreOptionsArgs<TData, TVariables> = FetchMoreQueryOptions<any, any> &
  FetchMoreOptions<TData, TVariables>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PromiseApolloQueryResult = Promise<ApolloQueryResult<any>>;

export class QueryTemplatePaginated<
  T extends QueryTemplatePaginatedProps,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TData = any,
  TVariables = OperationVariables
> extends React.PureComponent<T, TData, TVariables> {
  private queryVariables: TVariables | null = null;
  private myLoading: boolean = false;
  private fetchMore!: (
    fetchMoreOptions: FetchMoreOptionsArgs<TData, TVariables>
  ) => PromiseApolloQueryResult;

  private fetchMoreOptions!: (newActivePage: number) => FetchMoreOptionsArgs<TData, TVariables>;

  public memoizedRefetchQuery: (
    variables: TVariables,
    limit: number,
    refetch: (variables?: TVariables) => Promise<ApolloQueryResult<TData>>
  ) => inputsModel.Refetch;

  constructor(props: T) {
    super(props);
    this.memoizedRefetchQuery = memoizeOne(this.refetchQuery);
  }

  public setFetchMore = (
    val: (fetchMoreOptions: FetchMoreOptionsArgs<TData, TVariables>) => PromiseApolloQueryResult
  ) => {
    this.fetchMore = val;
  };

  public setFetchMoreOptions = (
    val: (newActivePage: number) => FetchMoreOptionsArgs<TData, TVariables>
  ) => {
    this.fetchMoreOptions = val;
  };

  public wrappedLoadMore = (newActivePage: number) => {
    return this.fetchMore(this.fetchMoreOptions(newActivePage));
  };

  public refetchQuery = (
    variables: TVariables,
    limit: number,
    refetch: (variables?: TVariables) => Promise<ApolloQueryResult<TData>>
  ): inputsModel.Refetch => () => {
    refetch({ ...variables, pagination: generateTablePaginationOptions(0, limit) });
  };

  public setPrevVariables(vars: TVariables) {
    this.queryVariables = vars;
  }

  public isItAValidLoading(loading: boolean, variables: TVariables, networkStatus: NetworkStatus) {
    if (
      !this.myLoading &&
      (!deepEqual(variables, this.queryVariables) || networkStatus === NetworkStatus.refetch) &&
      loading
    ) {
      this.myLoading = true;
    } else if (this.myLoading && !loading) {
      this.myLoading = false;
    }
    this.setPrevVariables(variables);
    return this.myLoading;
  }
}
