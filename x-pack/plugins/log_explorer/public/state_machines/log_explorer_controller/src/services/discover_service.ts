/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, ReplaySubject } from 'rxjs';
import { InvokeCreator } from 'xstate';
import { pick } from 'lodash';
import { QueryState } from '@kbn/data-plugin/common';
import { DiscoverAppState } from '@kbn/discover-plugin/public';
import { LogExplorerControllerContext, LogExplorerControllerEvent } from '../types';
import { PseudoDiscoverUrlState } from '../../../../controller/create_state_storage';

export const subscribeToStateStorageContainer =
  ({
    stateStorageContainer$,
  }: {
    stateStorageContainer$: ReplaySubject;
  }): InvokeCreator<LogExplorerControllerContext, LogExplorerControllerEvent> =>
  (context) => {
    return stateStorageContainer$.pipe(
      map((state) => {
        return {
          type: 'UPDATE_CONTEXT_FROM_STATE_STORAGE_CONTAINER',
          contextUpdates: state,
        };
      })
    );
  };

export const mapContextFromStateStorageContainer = (
  discoverApplicationState: DiscoverAppState,
  discoverGlobalState: QueryState
) => {
  const globalState = pick(discoverGlobalState, ['time', 'refreshInterval']);
  const appState = pick(discoverApplicationState, [
    'query',
    'filters',
    'columns',
    'grid',
    'rowHeight',
    'rowsPerPage',
  ]);

  return {
    ...globalState,
    ...appState,
  };
};

export const mapContextToStateStorageContainer = (
  context: LogExplorerControllerContext
): PseudoDiscoverUrlState => {
  return {
    // Global state
    _g: pick(context, ['time', 'refreshInterval']),
    // App state
    _a: pick(context, ['query', 'filters', 'columns', 'grid', 'rowHeight', 'rowsPerPage']),
  };
};
