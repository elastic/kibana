/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import {
  globalPolicySelector,
  globalTimeRangeSelector,
  inputsActions,
  inputsModel,
  State,
} from '../../store';
import { globalQuery } from '../../store/local';

interface GlobalTimeArgs {
  poll: number;
  from: number;
  to: number;
  setQuery: (params: { id: string; isLoading: boolean; refetch: inputsModel.Refetch }) => void;
}

interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

interface GlobalTimeDispatch {
  setQuery: (params: { id: string; isLoading: boolean; refetch: inputsModel.Refetch }) => void;
}

interface GlobalTimeReduxState {
  from: number;
  to: number;
  poll: number;
  query: inputsModel.GlobalQuery[];
}

type GlobalTimeProps = OwnProps & GlobalTimeReduxState & GlobalTimeDispatch;

const checkIfNeedToUpdateReduxState = (
  query: inputsModel.GlobalQuery[],
  setQuery: (params: { id: string; isLoading: boolean; refetch: inputsModel.Refetch }) => void,
  params: { id: string; isLoading: boolean; refetch: inputsModel.Refetch }
) => {
  const { isLoading, id } = params;
  if (query.length === 0 && isLoading) {
    setQuery(params);
  } else if (query.length > 0) {
    const oldItem = query.filter(i => i.id === id);
    if (oldItem.length === 0 && isLoading) {
      setQuery(params);
    } else if (oldItem.length > 0 && oldItem[0].isLoading !== isLoading) {
      setQuery(params);
    }
  }
};

const GlobalTimeComponent = pure<GlobalTimeProps>(
  ({ children, poll, from, to, query, setQuery }) => (
    <>
      {children({
        poll,
        from,
        to,
        setQuery: checkIfNeedToUpdateReduxState.bind(null, query, setQuery),
      })}
    </>
  )
);

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = globalTimeRangeSelector(state);
  const policy: inputsModel.Policy = globalPolicySelector(state);
  const query: inputsModel.GlobalQuery[] = globalQuery(state);
  return {
    query,
    poll: policy.kind === 'interval' && timerange.kind === 'absolute' ? policy.duration : 0,
    from: timerange.from,
    to: timerange.to,
  };
};

export const GlobalTime = connect(
  mapStateToProps,
  {
    setQuery: inputsActions.setQuery,
  }
)(GlobalTimeComponent);
