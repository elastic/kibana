/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPortal, EuiProgress } from '@elastic/eui';
import { pickBy } from 'lodash';
import React, { Fragment, useMemo, useReducer } from 'react';
import { useDelayedVisibility } from '../components/shared/useDelayedVisibility';

export const LoadingIndicatorContext = React.createContext({
  statuses: {},
  dispatchStatus: (_action: Action) => {},
});

interface State {
  [key: string]: boolean;
}

interface Action {
  isLoading: boolean;
  id: number;
}

function reducer(statuses: State, action: Action) {
  // Return an object with only the ids with `true` as their value, so that ids
  // that previously had `false` are removed and do not remain hanging around in
  // the object.
  return pickBy(
    { ...statuses, [action.id.toString()]: action.isLoading },
    Boolean
  );
}

function getIsAnyLoading(statuses: State) {
  return Object.values(statuses).some((isLoading) => isLoading);
}

export function LoadingIndicatorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [statuses, dispatchStatus] = useReducer(reducer, {});
  const isLoading = useMemo(() => getIsAnyLoading(statuses), [statuses]);
  const shouldShowLoadingIndicator = useDelayedVisibility(isLoading);
  const contextValue = React.useMemo(() => ({ statuses, dispatchStatus }), [
    statuses,
  ]);

  return (
    <Fragment>
      {shouldShowLoadingIndicator && (
        <EuiPortal>
          <EuiProgress size="xs" position="fixed" />
        </EuiPortal>
      )}

      <LoadingIndicatorContext.Provider
        value={contextValue}
        children={children}
      />
    </Fragment>
  );
}
