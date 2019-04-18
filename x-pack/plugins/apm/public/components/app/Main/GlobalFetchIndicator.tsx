/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiDelayHide, EuiPortal, EuiProgress } from '@elastic/eui';
import React, { Fragment, useMemo, useReducer } from 'react';

export const GlobalFetchContext = React.createContext({
  statuses: {},
  dispatchStatus: (action: Action) => undefined as void
});

interface State {
  [key: string]: boolean;
}

interface Action {
  isLoading: boolean;
  name: string;
}

function reducer(statuses: State, action: Action) {
  return { ...statuses, [action.name]: action.isLoading };
}

function getIsAnyLoading(statuses: State) {
  return Object.values(statuses).some(isLoading => isLoading);
}

export function GlobalFetchIndicator({
  children
}: {
  children: React.ReactNode;
}) {
  const [statuses, dispatchStatus] = useReducer(reducer, {});
  const isLoading = useMemo(() => getIsAnyLoading(statuses), [statuses]);

  return (
    <Fragment>
      <EuiDelayHide
        hide={!isLoading}
        minimumDuration={1000}
        render={() => (
          <EuiPortal>
            <EuiProgress size="xs" position="fixed" />
          </EuiPortal>
        )}
      />

      <GlobalFetchContext.Provider
        value={{ statuses, dispatchStatus }}
        children={children}
      />
    </Fragment>
  );
}
