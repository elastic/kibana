/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { Query } from 'react-apollo';
import { connect, ConnectedProps } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { GetIpOverviewQuery, IpOverviewData } from '../../../graphql/types';
import { inputsModel, inputsSelectors, State } from '../../../common/store';
import { useUiSetting } from '../../../common/lib/kibana';
import { createFilter, getDefaultFetchPolicy } from '../../../common/containers/helpers';
import { QueryTemplateProps } from '../../../common/containers/query_template';
import { networkModel } from '../../store';
import { ipOverviewQuery } from './index.gql_query';

const ID = 'ipOverviewQuery';

export interface IpOverviewArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  ipOverviewData: IpOverviewData;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

export interface IpOverviewProps extends QueryTemplateProps {
  children: (args: IpOverviewArgs) => React.ReactNode;
  type: networkModel.NetworkType;
  ip: string;
}

const IpOverviewComponentQuery = React.memo<IpOverviewProps & PropsFromRedux>(
  ({ id = ID, docValueFields, isInspected, children, filterQuery, skip, sourceId, ip }) => (
    <Query<GetIpOverviewQuery.Query, GetIpOverviewQuery.Variables>
      query={ipOverviewQuery}
      fetchPolicy={getDefaultFetchPolicy()}
      notifyOnNetworkStatusChange
      skip={skip}
      variables={{
        sourceId,
        filterQuery: createFilter(filterQuery),
        ip,
        defaultIndex: useUiSetting<string[]>(DEFAULT_INDEX_KEY),
        docValueFields: docValueFields ?? [],
        inspect: isInspected,
      }}
    >
      {({ data, loading, refetch }) => {
        const init: IpOverviewData = { host: {} };
        const ipOverviewData: IpOverviewData = getOr(init, 'source.IpOverview', data);
        return children({
          id,
          inspect: getOr(null, 'source.IpOverview.inspect', data),
          ipOverviewData,
          loading,
          refetch,
        });
      }}
    </Query>
  )
);

IpOverviewComponentQuery.displayName = 'IpOverviewComponentQuery';

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: IpOverviewProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const IpOverviewQuery = connector(IpOverviewComponentQuery);
