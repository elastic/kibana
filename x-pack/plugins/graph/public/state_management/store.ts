/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import { combineReducers, createStore, Store, AnyAction, Dispatch, applyMiddleware } from 'redux';
import { ChromeStart, I18nStart, OverlayStart, SavedObjectsClientContract } from 'kibana/public';
import { CoreStart } from 'src/core/public';
import { ReactElement } from 'react';
import {
  fieldsReducer,
  FieldsState,
  syncNodeStyleSaga,
  syncFieldsSaga,
  updateSaveButtonSaga,
} from './fields';
import { UrlTemplatesState, urlTemplatesReducer, syncTemplatesSaga } from './url_templates';
import {
  AdvancedSettingsState,
  advancedSettingsReducer,
  syncSettingsSaga,
} from './advanced_settings';
import { DatasourceState, datasourceReducer } from './datasource';
import { datasourceSaga } from './datasource.sagas';
import { IndexPatternProvider, Workspace, GraphSavePolicy, AdvancedSettings } from '../types';
import { loadingSaga, savingSaga } from './persistence';
import { metaDataReducer, MetaDataState, syncBreadcrumbSaga } from './meta_data';
import { fillWorkspaceSaga, submitSearchSaga, workspaceReducer, WorkspaceState } from './workspace';

export interface GraphState {
  fields: FieldsState;
  urlTemplates: UrlTemplatesState;
  advancedSettings: AdvancedSettingsState;
  datasource: DatasourceState;
  metaData: MetaDataState;
  workspace: WorkspaceState;
}

export interface GraphStoreDependencies {
  addBasePath: (url: string) => string;
  indexPatternProvider: IndexPatternProvider;
  createWorkspace: (index: string, advancedSettings: AdvancedSettings) => Workspace;
  getWorkspace: () => Workspace | undefined;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  overlays: OverlayStart;
  savedObjectsClient: SavedObjectsClientContract;
  showSaveModal: (el: ReactElement, I18nContext: I18nStart['Context']) => void;
  savePolicy: GraphSavePolicy;
  changeUrl: (newUrl: string) => void;
  notifyReact: () => void;
  chrome: ChromeStart;
  I18nContext: I18nStart['Context'];
  basePath: string;
  handleSearchQueryError: (err: Error | string) => void;
}

export function createRootReducer(addBasePath: (url: string) => string) {
  return combineReducers({
    fields: fieldsReducer,
    urlTemplates: urlTemplatesReducer(addBasePath),
    advancedSettings: advancedSettingsReducer,
    datasource: datasourceReducer,
    metaData: metaDataReducer,
    workspace: workspaceReducer,
  });
}

function registerSagas(sagaMiddleware: SagaMiddleware<object>, deps: GraphStoreDependencies) {
  sagaMiddleware.run(datasourceSaga(deps));
  sagaMiddleware.run(loadingSaga(deps));
  sagaMiddleware.run(savingSaga(deps));
  sagaMiddleware.run(syncFieldsSaga(deps));
  sagaMiddleware.run(syncNodeStyleSaga(deps));
  sagaMiddleware.run(syncSettingsSaga(deps));
  sagaMiddleware.run(updateSaveButtonSaga(deps));
  sagaMiddleware.run(syncBreadcrumbSaga(deps));
  sagaMiddleware.run(syncTemplatesSaga(deps));
  sagaMiddleware.run(fillWorkspaceSaga(deps));
  sagaMiddleware.run(submitSearchSaga(deps));
}

export const createGraphStore = (deps: GraphStoreDependencies): Store => {
  const sagaMiddleware = createSagaMiddleware();

  const rootReducer = createRootReducer(deps.addBasePath);

  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));

  registerSagas(sagaMiddleware, deps);

  return store;
};

export type GraphStore = Store<GraphState, AnyAction>;
export type GraphDispatch = Dispatch<AnyAction>;
