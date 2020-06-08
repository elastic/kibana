/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';
import { compose } from 'redux';

import { DocumentNode } from 'graphql';
import { ScaleType } from '@elastic/charts';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import {
  GetNetworkDnsQuery,
  NetworkDnsEdges,
  NetworkDnsSortField,
  PageInfoPaginated,
  MatrixOverOrdinalHistogramData,
} from '../../../graphql/types';
import { inputsModel, State, inputsSelectors } from '../../../common/store';
import { withKibana, WithKibanaProps } from '../../../common/lib/kibana';
import { generateTablePaginationOptions } from '../../../common/components/paginated_table/helpers';
import { createFilter, getDefaultFetchPolicy } from '../../../common/containers/helpers';
import {
  QueryTemplatePaginated,
  QueryTemplatePaginatedProps,
} from '../../../common/containers/query_template_paginated';
import { networkDnsQuery } from './index.gql_query';
import { DEFAULT_TABLE_ACTIVE_PAGE, DEFAULT_TABLE_LIMIT } from '../../../common/store/constants';
import { MatrixHistogram } from '../../../common/components/matrix_histogram';
import {
  MatrixHistogramOption,
  GetSubTitle,
} from '../../../common/components/matrix_histogram/types';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { SetQuery } from '../../../hosts/pages/navigation/types';
import { networkModel, networkSelectors } from '../../store';

const ID = 'networkDnsQuery';
export const HISTOGRAM_ID = 'networkDnsHistogramQuery';
export interface NetworkDnsArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  isInspected: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  networkDns: NetworkDnsEdges[];
  pageInfo: PageInfoPaginated;
  refetch: inputsModel.Refetch;
  stackByField?: string;
  totalCount: number;
  histogram: MatrixOverOrdinalHistogramData[];
}

export interface OwnProps extends QueryTemplatePaginatedProps {
  children: (args: NetworkDnsArgs) => React.ReactNode;
  type: networkModel.NetworkType;
}

interface DnsHistogramOwnProps extends QueryTemplatePaginatedProps {
  dataKey: string | string[];
  defaultStackByOption: MatrixHistogramOption;
  errorMessage: string;
  isDnsHistogram?: boolean;
  query: DocumentNode;
  scaleType: ScaleType;
  setQuery: SetQuery;
  showLegend?: boolean;
  stackByOptions: MatrixHistogramOption[];
  subtitle?: string | GetSubTitle;
  title: string;
  type: networkModel.NetworkType;
  updateDateRange: UpdateDateRange;
  yTickFormatter?: (value: number) => string;
}

export interface NetworkDnsComponentReduxProps {
  activePage: number;
  sort: NetworkDnsSortField;
  isInspected: boolean;
  isPtrIncluded: boolean;
  limit: number;
}

type NetworkDnsProps = OwnProps & NetworkDnsComponentReduxProps & WithKibanaProps;

export class NetworkDnsComponentQuery extends QueryTemplatePaginated<
  NetworkDnsProps,
  GetNetworkDnsQuery.Query,
  GetNetworkDnsQuery.Variables
> {
  public render() {
    const {
      activePage,
      children,
      sort,
      endDate,
      filterQuery,
      id = ID,
      isInspected,
      isPtrIncluded,
      kibana,
      limit,
      skip,
      sourceId,
      startDate,
    } = this.props;
    const variables: GetNetworkDnsQuery.Variables = {
      defaultIndex: kibana.services.uiSettings.get<string[]>(DEFAULT_INDEX_KEY),
      filterQuery: createFilter(filterQuery),
      inspect: isInspected,
      isPtrIncluded,
      pagination: generateTablePaginationOptions(activePage, limit),
      sort,
      sourceId,
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
    };

    return (
      <Query<GetNetworkDnsQuery.Query, GetNetworkDnsQuery.Variables>
        fetchPolicy={getDefaultFetchPolicy()}
        notifyOnNetworkStatusChange
        query={networkDnsQuery}
        skip={skip}
        variables={variables}
      >
        {({ data, loading, fetchMore, networkStatus, refetch }) => {
          const networkDns = getOr([], `source.NetworkDns.edges`, data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newActivePage: number) => ({
            variables: {
              pagination: generateTablePaginationOptions(newActivePage, limit),
            },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult) {
                return prev;
              }
              return {
                ...fetchMoreResult,
                source: {
                  ...fetchMoreResult.source,
                  NetworkDns: {
                    ...fetchMoreResult.source.NetworkDns,
                    edges: [...fetchMoreResult.source.NetworkDns.edges],
                  },
                },
              };
            },
          }));
          const isLoading = this.isItAValidLoading(loading, variables, networkStatus);
          return children({
            id,
            inspect: getOr(null, 'source.NetworkDns.inspect', data),
            isInspected,
            loading: isLoading,
            loadPage: this.wrappedLoadMore,
            networkDns,
            pageInfo: getOr({}, 'source.NetworkDns.pageInfo', data),
            refetch: this.memoizedRefetchQuery(variables, limit, refetch),
            totalCount: getOr(-1, 'source.NetworkDns.totalCount', data),
            histogram: getOr(null, 'source.NetworkDns.histogram', data),
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getNetworkDnsSelector(state),
      isInspected,
      id,
    };
  };

  return mapStateToProps;
};

const makeMapHistogramStateToProps = () => {
  const getNetworkDnsSelector = networkSelectors.dnsSelector();
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = HISTOGRAM_ID }: DnsHistogramOwnProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      ...getNetworkDnsSelector(state),
      activePage: DEFAULT_TABLE_ACTIVE_PAGE,
      limit: DEFAULT_TABLE_LIMIT,
      isInspected,
      id,
    };
  };

  return mapStateToProps;
};

export const NetworkDnsQuery = compose<React.ComponentClass<OwnProps>>(
  connect(makeMapStateToProps),
  withKibana
)(NetworkDnsComponentQuery);

export const NetworkDnsHistogramQuery = compose<React.ComponentClass<DnsHistogramOwnProps>>(
  connect(makeMapHistogramStateToProps),
  withKibana
)(MatrixHistogram);
