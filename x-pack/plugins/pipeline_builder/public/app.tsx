/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, useReducer } from 'react';
import { Router } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
import { Filter, Query } from '../../../../src/plugins/data/public';
import {
  createStateContainerReactHelpers,
  IKbnUrlStateStorage,
  ReduxLikeStateContainer,
} from '../../../../src/plugins/kibana_utils/public';
import { PipelineAppDeps, State } from './types';
import { PLUGIN_ID } from '../common';
import { Layout } from './components';
import {
  reducer,
  useAppStateSyncing,
  useCreateStateContainer,
  useGlobalStateSyncing,
  useIndexPattern,
  useLoader,
} from './state';
import { nodeRegistry } from './nodes';

interface AppState {
  filters: Filter[];
  query?: Query;
}
const defaultAppState: AppState = {
  filters: [],
};
const {
  Provider: AppStateContainerProvider,
  useState: useAppState,
  useContainer: useAppStateContainer,
} = createStateContainerReactHelpers<ReduxLikeStateContainer<AppState>>();

export const App = (props: {
  coreStart: CoreStart;
  deps: PipelineAppDeps;
  history: AppMountParameters['history'];
  kbnUrlStateStorage: IKbnUrlStateStorage;
}) => {
  const {
    deps: { data },
    history,
    kbnUrlStateStorage,
  } = props;
  const appStateContainer = useCreateStateContainer(defaultAppState);

  useGlobalStateSyncing(data.query, kbnUrlStateStorage);
  useAppStateSyncing(appStateContainer, data.query, kbnUrlStateStorage);

  return (
    <I18nProvider>
      <KibanaContextProvider
        services={{
          appName: 'pipeline_builder',
          ...props.coreStart,
          ...props.deps,
        }}
      >
        <AppStateContainerProvider value={appStateContainer}>
          <Router history={history}>
            <AppHome deps={props.deps} />
          </Router>
        </AppStateContainerProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

function AppHome(props: { deps: PipelineAppDeps }) {
  const { data, navigation } = props.deps;
  const appStateContainer = useAppStateContainer();
  const appState = useAppState();

  const onQuerySubmit = useCallback(
    ({ query }) => {
      appStateContainer.set({ ...appState, query });
    },
    [appState, appStateContainer]
  );

  const [state, dispatch] = useReducer(reducer, {
    nodes: {
      0: {
        id: '0',
        type: 'search',
        state: nodeRegistry.search.initialize(),
        inputNodeIds: [],
      },
      1: {
        id: '1',
        type: 'convert',
        state: nodeRegistry.convert.initialize(),
        inputNodeIds: ['0'],
      },
    },
    rendererState: {},
    loading: false,
  } as State);

  const loader = useLoader();
  useEffect(() => {
    const subscription = loader.completion$.subscribe(() => {
      dispatch({ type: 'LOADING_SUCCESS' });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [loader]);

  const indexPattern = useIndexPattern(data);
  if (!indexPattern)
    return <div>No index pattern found. Please create an index pattern before loading...</div>;

  return (
    <EuiPage className="pipelineBuilderApp">
      {/* <div className="pipelineBuilderApp__header">
        <navigation.ui.TopNavMenu
          appName={PLUGIN_ID}
          showSearchBar={true}
          indexPatterns={[indexPattern]}
          useDefaultBehaviors={true}
          onQuerySubmit={onQuerySubmit}
          query={appState.query}
          showSaveQuery={true}
        />
      </div> */}
      <EuiPageBody>
        <Layout state={state} dispatch={dispatch} />
      </EuiPageBody>
    </EuiPage>
  );
}
