/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryState } from '@kbn/data-plugin/common';
import { DiscoverAppState } from '@kbn/discover-plugin/public';
import { createStateContainer, IStateStorage } from '@kbn/kibana-utils-plugin/public';
import { map } from 'rxjs';
import { LogExplorerControllerContext } from '../state_machines/log_explorer_controller';
import { mapContextToStateStorageContainer } from '../state_machines/log_explorer_controller/src/services/discover_service';

export interface PseudoDiscoverUrlState {
  _g?: QueryState;
  _a?: DiscoverAppState;
}

// The Discover container would normally use the URL as state storage, we use this container to intercept state and instead use the Log Explorer as the state storage.
export const createStateStorageContainer = ({
  initialState,
}: {
  initialState?: LogExplorerControllerContext;
}): IStateStorage => {
  // Stores a full pseudo representation so that Discover can rely on merging / spreading get() results to set() calls
  const stateContainer = createStateContainer<PseudoDiscoverUrlState>(
    initialState ? mapContextToStateStorageContainer(initialState) : {}
  );

  return {
    get: (key: string) => {
      return stateContainer.get()[key] ?? null;
    },
    // This allows us to intercept global and application state (the exception is internal state, this is observed directly via it's change$ observable)
    set: (key: string, state) => {
      return stateContainer.set({ ...stateContainer.get(), [key]: state });
    },
    change$: (key: string) => {
      return stateContainer.state$.pipe(map((state) => state[key] ?? null));
    },
  };
};
