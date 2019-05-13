/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, useReducer } from 'react';
import { render } from 'react-dom';
import { HashRouter } from 'react-router-dom';

import { App } from './app';
import { AppStateProvider, initialState, reducer } from './services/state';
import { AppCore, AppDependencies, AppPlugins } from './types';

export { BASE_PATH as CLIENT_BASE_PATH } from './constants';

/**
 * App dependencies
 */
let DependenciesContext: React.Context<AppDependencies>;
let appDependencies: AppDependencies;

export const setAppDependencies = (deps: AppDependencies) => {
  appDependencies = deps;
  DependenciesContext = createContext<AppDependencies>(appDependencies);
  return DependenciesContext;
};

export const useAppDependencies = () => {
  if (!DependenciesContext) {
    throw new Error(`The app dependencies Context hasn't been set.
    Use the "setAppDependencies()" method when bootstrapping the app.`);
  }
  return useContext<AppDependencies>(DependenciesContext);
};

const ReactApp: React.FunctionComponent = (/* { core, plugins }*/) => {
  const {
    i18n: { Context: I18nContext },
  } = appDependencies.core;

  return (
    <I18nContext>
      <HashRouter>
        <DependenciesContext.Provider value={appDependencies}>
          <AppStateProvider value={useReducer(reducer, initialState)}>
            <App />
          </AppStateProvider>
        </DependenciesContext.Provider>
      </HashRouter>
    </I18nContext>
  );
};

export const renderReact = async (
  elem: Element,
  core: AppCore,
  plugins: AppPlugins
): Promise<void> => {
  setAppDependencies({ core, plugins });
  render(<ReactApp />, elem);
};
