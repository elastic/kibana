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

interface GlobalTimeArgs {
  poll: number;
  from: number;
  to: number;
  setQuery: (params: { id: string; loading: boolean; refetch: inputsModel.Refetch }) => void;
}

interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

interface GlobalTimeDispatch {
  setQuery: (params: { id: string; loading: boolean; refetch: inputsModel.Refetch }) => void;
}

interface GlobalTimeReduxState {
  from: number;
  to: number;
  poll: number;
}

type GlobalTimeProps = OwnProps & GlobalTimeReduxState & GlobalTimeDispatch;

const GlobalTimeComponent = pure<GlobalTimeProps>(({ children, poll, from, to, setQuery }) => (
  <>
    {children({
      poll,
      from,
      to,
      setQuery,
    })}
  </>
));

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = globalTimeRangeSelector(state);
  const policy: inputsModel.Policy = globalPolicySelector(state);
  return {
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
