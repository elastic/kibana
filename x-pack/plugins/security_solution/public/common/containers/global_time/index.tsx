/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { inputsModel, inputsSelectors, State } from '../../store';
import { inputsActions } from '../../store/actions';

interface SetQuery {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch | inputsModel.RefetchKql;
}

export interface GlobalTimeArgs {
  from: string;
  to: string;
  setQuery: ({ id, inspect, loading, refetch }: SetQuery) => void;
  deleteQuery?: ({ id }: { id: string }) => void;
  isInitializing: boolean;
}

interface OwnProps {
  children: (args: GlobalTimeArgs) => React.ReactNode;
}

type GlobalTimeProps = OwnProps & PropsFromRedux;

export const GlobalTimeComponent: React.FC<GlobalTimeProps> = ({
  children,
  deleteAllQuery,
  deleteOneQuery,
  from,
  to,
  setGlobalQuery,
}) => {
  const [isInitializing, setIsInitializing] = useState(true);

  const setQuery = useCallback(
    ({ id, inspect, loading, refetch }: SetQuery) =>
      setGlobalQuery({ inputId: 'global', id, inspect, loading, refetch }),
    [setGlobalQuery]
  );

  const deleteQuery = useCallback(
    ({ id }: { id: string }) => deleteOneQuery({ inputId: 'global', id }),
    [deleteOneQuery]
  );

  useEffect(() => {
    if (isInitializing) {
      setIsInitializing(false);
    }
    return () => {
      deleteAllQuery({ id: 'global' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {children({
        isInitializing,
        from,
        to,
        setQuery,
        deleteQuery,
      })}
    </>
  );
};

const mapStateToProps = (state: State) => {
  const timerange: inputsModel.TimeRange = inputsSelectors.globalTimeRangeSelector(state);
  return {
    from: timerange.from,
    to: timerange.to,
  };
};

const mapDispatchToProps = {
  deleteAllQuery: inputsActions.deleteAllQuery,
  deleteOneQuery: inputsActions.deleteOneQuery,
  setGlobalQuery: inputsActions.setQuery,
};

export const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const GlobalTime = connector(React.memo(GlobalTimeComponent));

GlobalTime.displayName = 'GlobalTime';
