/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { Router } from 'react-router-dom';
import { MemoryHistory } from 'history/createMemoryHistory';
import { createMemoryHistory } from 'history';
import { mountWithIntl, renderWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { MountWithReduxProvider } from './helper_with_redux';
import { AppState } from '../../state';

const helperWithRouter: <R>(
  helper: (node: ReactElement) => R,
  component: ReactElement,
  customHistory?: MemoryHistory,
  wrapReduxStore?: boolean,
  storeState?: AppState
) => R = (helper, component, customHistory, wrapReduxStore, storeState) => {
  const history = customHistory ?? createMemoryHistory();

  history.location.key = 'TestKeyForTesting';

  const routerWrapper = <Router history={history}>{component}</Router>;

  if (wrapReduxStore) {
    return helper(
      <MountWithReduxProvider state={storeState}>{routerWrapper}</MountWithReduxProvider>
    );
  }

  return helper(routerWrapper);
};

export const renderWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(renderWithIntl, component, customHistory);
};

export const shallowWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(shallowWithIntl, component, customHistory);
};

export const mountWithRouter = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(mountWithIntl, component, customHistory);
};

export const renderWithRouterRedux = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(renderWithIntl, component, customHistory, true);
};

export const shallowWithRouterRedux = (component: ReactElement, customHistory?: MemoryHistory) => {
  return helperWithRouter(shallowWithIntl, component, customHistory, true);
};

export const mountWithRouterRedux = (
  component: ReactElement,
  options?: { customHistory?: MemoryHistory; storeState?: AppState }
) => {
  return helperWithRouter(
    mountWithIntl,
    component,
    options?.customHistory,
    true,
    options?.storeState
  );
};
