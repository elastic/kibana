/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import React, { useMemo } from 'react';
import { Query } from 'react-apollo';
import { connect, ConnectedProps } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { GetOverviewHostQuery, OverviewHostData } from '../../../graphql/types';
import { useUiSetting } from '../../../common/lib/kibana';
import { inputsModel, inputsSelectors } from '../../../common/store/inputs';
import { State } from '../../../common/store';
import { createFilter, getDefaultFetchPolicy } from '../../../common/containers/helpers';
import { QueryTemplateProps } from '../../../common/containers/query_template';

import { overviewHostQuery } from './index.gql_query';
import { useManageSource } from '../../../common/containers/sourcerer';
import { SOURCERER_FEATURE_FLAG_ON } from '../../../common/containers/sourcerer/constants';

export const ID = 'overviewHostQuery';

export interface OverviewHostArgs {
  id: string;
  inspect: inputsModel.InspectQuery;
  loading: boolean;
  overviewHost: OverviewHostData;
  refetch: inputsModel.Refetch;
}

export interface OverviewHostProps extends QueryTemplateProps {
  children: (args: OverviewHostArgs) => React.ReactNode;
  sourceId: string;
  endDate: string;
  startDate: string;
}

const OverviewHostComponentQuery = React.memo<OverviewHostProps & PropsFromRedux>(
  ({ id = ID, children, filterQuery, isInspected, sourceId, startDate, endDate }) => {
    const { activeSourceGroupId, getManageSourceGroupById } = useManageSource();
    const { indexPatterns } = useMemo(() => getManageSourceGroupById(activeSourceGroupId), [
      getManageSourceGroupById,
      activeSourceGroupId,
    ]);
    const uiDefaultIndexPatterns = useUiSetting<string[]>(DEFAULT_INDEX_KEY);
    const defaultIndex = SOURCERER_FEATURE_FLAG_ON ? indexPatterns : uiDefaultIndexPatterns;
    return (
      <Query<GetOverviewHostQuery.Query, GetOverviewHostQuery.Variables>
        query={overviewHostQuery}
        fetchPolicy={getDefaultFetchPolicy()}
        variables={{
          sourceId,
          timerange: {
            interval: '12h',
            from: startDate,
            to: endDate,
          },
          filterQuery: createFilter(filterQuery),
          defaultIndex,
          inspect: isInspected,
        }}
      >
        {({ data, loading, refetch }) => {
          const overviewHost = getOr({}, `source.OverviewHost`, data);
          return children({
            id,
            inspect: getOr(null, 'source.OverviewHost.inspect', data),
            overviewHost,
            loading,
            refetch,
          });
        }}
      </Query>
    );
  }
);

OverviewHostComponentQuery.displayName = 'OverviewHostComponentQuery';

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { id = ID }: OverviewHostProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const OverviewHostQuery = connector(OverviewHostComponentQuery);
