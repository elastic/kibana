/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';

interface GlobalTimeArgs {
  from: number;
  to: number;
  setQuery: (
    { id, loading, refetch }: { id: string; loading: boolean; refetch: inputsModel.Refetch }
  ) => void;
}

interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

interface GlobalTimeDispatch {
  setGlobalQuery: ActionCreator<{
    inputId: inputsModel.InputsModelId;
    id: string;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }>;
  deleteAllQuery: ActionCreator<{ id: inputsModel.InputsModelId }>;
}

interface GlobalTimeReduxState {
  from: number;
  to: number;
}

type GlobalTimeProps = OwnProps & GlobalTimeReduxState & GlobalTimeDispatch;

class GlobalTimeComponent extends React.PureComponent<GlobalTimeProps> {
  public componentDidMount() {
    this.props.deleteAllQuery({ id: 'global' });
  }

  public render() {
    const { children, from, to, setGlobalQuery } = this.props;
    return (
      <>
        {children({
          from,
          to,
          setQuery: ({ id, loading, refetch }) =>
            setGlobalQuery({ inputId: 'global', id, loading, refetch }),
        })}
      </>
    );
  }
}

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = inputsSelectors.globalTimeRangeSelector(state);
  return {
    from: timerange.from,
    to: timerange.to,
  };
};

export const GlobalTime = connect(
  mapStateToProps,
  {
    deleteAllQuery: inputsActions.deleteAllQuery,
    setGlobalQuery: inputsActions.setQuery,
  }
)(GlobalTimeComponent);
