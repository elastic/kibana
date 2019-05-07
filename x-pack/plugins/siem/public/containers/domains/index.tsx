/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect } from 'react-redux';

import { FlowDirection, FlowTarget } from '../../../server/graphql/types';
import { DomainsEdges, DomainsSortField, GetDomainsQuery, PageInfo } from '../../graphql/types';
import { inputsModel, networkModel, networkSelectors, State } from '../../store';
import { createFilter } from '../helpers';
import { QueryTemplate, QueryTemplateProps } from '../query_template';

import { domainsQuery } from './index.gql_query';

export interface DomainsArgs {
  id: string;
  domains: DomainsEdges[];
  totalCount: number;
  pageInfo: PageInfo;
  loading: boolean;
  loadMore: (cursor: string) => void;
  refetch: inputsModel.Refetch;
}

export interface OwnProps extends QueryTemplateProps {
  children: (args: DomainsArgs) => React.ReactNode;
  flowTarget: FlowTarget;
  ip: string;
  type: networkModel.NetworkType;
}

export interface DomainsComponentReduxProps {
  limit: number;
  domainsSortField: DomainsSortField;
  flowDirection: FlowDirection;
}

type DomainsProps = OwnProps & DomainsComponentReduxProps;

class DomainsComponentQuery extends QueryTemplate<
  DomainsProps,
  GetDomainsQuery.Query,
  GetDomainsQuery.Variables
> {
  public render() {
    const {
      id = 'domainsQuery',
      children,
      domainsSortField,
      filterQuery,
      ip,
      sourceId,
      startDate,
      endDate,
      limit,
      flowTarget,
      flowDirection,
    } = this.props;
    return (
      <Query<GetDomainsQuery.Query, GetDomainsQuery.Variables>
        query={domainsQuery}
        fetchPolicy="cache-and-network"
        notifyOnNetworkStatusChange
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate!,
            to: endDate!,
          },
          ip,
          flowDirection,
          flowTarget,
          sort: domainsSortField,
          pagination: {
            limit,
            cursor: null,
            tiebreaker: null,
          },
          filterQuery: createFilter(filterQuery),
        }}
      >
        {({ data, loading, fetchMore, refetch }) => {
          const domains = getOr([], `source.Domains.edges`, data);
          this.setFetchMore(fetchMore);
          this.setFetchMoreOptions((newCursor: string) => ({
            variables: {
              pagination: {
                cursor: newCursor,
                limit: limit + parseInt(newCursor, 10),
              },
            },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult) {
                return prev;
              }
              return {
                ...fetchMoreResult,
                source: {
                  ...fetchMoreResult.source,
                  Domains: {
                    ...fetchMoreResult.source.Domains,
                    edges: [...prev.source.Domains.edges, ...fetchMoreResult.source.Domains.edges],
                  },
                },
              };
            },
          }));
          return children({
            id,
            refetch,
            loading,
            totalCount: getOr(0, 'source.Domains.totalCount', data),
            domains,
            pageInfo: getOr({}, 'source.Domains.pageInfo', data),
            loadMore: this.wrappedLoadMore,
          });
        }}
      </Query>
    );
  }
}

const makeMapStateToProps = () => {
  const getDomainsSelector = networkSelectors.domainsSelector();
  const mapStateToProps = (state: State) => ({
    ...getDomainsSelector(state),
  });

  return mapStateToProps;
};

export const DomainsQuery = connect(makeMapStateToProps)(DomainsComponentQuery);
