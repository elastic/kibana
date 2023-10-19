/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { InvokeCreator } from 'xstate';
import { LogExplorerProfileContext, LogExplorerProfileEvent } from './types';

interface LogExplorerProfileDataViewStateDependencies {
  stateContainer: DiscoverStateContainer;
}

export const createAndSetDataView =
  ({
    stateContainer,
  }: LogExplorerProfileDataViewStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (context) => {
    const dataView = await stateContainer.actions.createAndAppendAdHocDataView(
      context.datasetSelection.toDataviewSpec()
    );
    /**
     * We can't fully rely on the url update of the index param to create and restore the data view
     * due to a race condition where Discover, when initializing its internal logic,
     * check the value the index params before it gets updated in the line above.
     * In case the index param does not exist, it then create a internal saved search and set the current data view
     * to the existing one or the default logs-*.
     * We set explicitly the data view here to be used when restoring the data view on the initial load.
     */
    stateContainer.actions.setDataView(dataView);
  };
