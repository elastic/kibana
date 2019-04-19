/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsActions, inputsModel, inputsSelectors, State } from '../../store';

interface GlobalTimeArgs {
  poll: number;
  from: number;
  to: number;
  setQuery: ActionCreator<{ id: string; loading: boolean; refetch: inputsModel.Refetch }>;
}

interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

interface GlobalTimeDispatch {
  setQuery: ActionCreator<{ id: string; loading: boolean; refetch: inputsModel.Refetch }>;
  deleteAllQuery: () => void;
}

interface GlobalTimeReduxState {
  from: number;
  to: number;
  poll: number;
}

type GlobalTimeProps = OwnProps & GlobalTimeReduxState & GlobalTimeDispatch;

class GlobalTimeComponent extends React.PureComponent<GlobalTimeProps> {
  public componentDidMount() {
    this.props.deleteAllQuery();
  }

  public render() {
    const { children, poll, from, to, setQuery } = this.props;
    return (
      <>
        {children({
          poll,
          from,
          to,
          setQuery,
        })}
      </>
    );
  }
}

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = inputsSelectors.globalTimeRangeSelector(state);
  const policy: inputsModel.Policy = inputsSelectors.globalPolicySelector(state);
  return {
    poll: policy.kind === 'interval' && timerange.kind === 'absolute' ? policy.duration : 0,
    from: timerange.from,
    to: timerange.to,
  };
};

export const GlobalTime = connect(
  mapStateToProps,
  {
    deleteAllQuery: inputsActions.deleteAllQuery,
    setQuery: inputsActions.setQuery,
  }
)(GlobalTimeComponent);
