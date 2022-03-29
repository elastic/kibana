/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ReactWrapper } from 'enzyme';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { Provider } from 'react-redux';
import { act } from 'react-dom/test-utils';
import { PreloadedState } from '@reduxjs/toolkit';
import { LensAppServices } from '../app_plugin/types';

import {
  makeConfigureStore,
  LensAppState,
  LensState,
  LensStoreDeps,
} from '../state_management/index';
import { getResolvedDateRange } from '../utils';
import { DatasourceMap, VisualizationMap } from '../types';
import { mockVisualizationMap } from './visualization_mock';
import { mockDatasourceMap } from './datasource_mock';
import { makeDefaultServices } from './services_mock';

export const mockStoreDeps = (deps?: {
  lensServices?: LensAppServices;
  datasourceMap?: DatasourceMap;
  visualizationMap?: VisualizationMap;
}) => {
  return {
    datasourceMap: deps?.datasourceMap || mockDatasourceMap(),
    visualizationMap: deps?.visualizationMap || mockVisualizationMap(),
    lensServices: deps?.lensServices || makeDefaultServices(),
  };
};

export function mockDatasourceStates() {
  return {
    testDatasource: {
      state: {},
      isLoading: false,
    },
  };
}

export const defaultState = {
  searchSessionId: 'sessionId-1',
  filters: [],
  query: { language: 'lucene', query: '' },
  resolvedDateRange: { fromDate: '2021-01-10T04:00:00.000Z', toDate: '2021-01-10T08:00:00.000Z' },
  isFullscreenDatasource: false,
  isSaveable: false,
  isLoading: false,
  isLinkedToOriginatingApp: false,
  activeDatasourceId: 'testDatasource',
  visualization: {
    state: {},
    activeId: 'testVis',
  },
  datasourceStates: mockDatasourceStates(),
};

export function makeLensStore({
  preloadedState,
  dispatch,
  storeDeps = mockStoreDeps(),
}: {
  storeDeps?: LensStoreDeps;
  preloadedState?: Partial<LensAppState>;
  dispatch?: jest.Mock;
}) {
  const data = storeDeps.lensServices.data;
  const store = makeConfigureStore(storeDeps, {
    lens: {
      ...defaultState,
      query: data.query.queryString.getQuery(),
      filters: data.query.filterManager.getGlobalFilters(),
      resolvedDateRange: getResolvedDateRange(data.query.timefilter.timefilter),
      ...preloadedState,
    },
  } as PreloadedState<LensState>);

  const origDispatch = store.dispatch;
  store.dispatch = jest.fn(dispatch || origDispatch);
  return { store, deps: storeDeps };
}

export interface MountStoreProps {
  storeDeps?: LensStoreDeps;
  preloadedState?: Partial<LensAppState>;
  dispatch?: jest.Mock;
}

export const mountWithProvider = (
  component: React.ReactElement,
  store?: MountStoreProps,
  options?: {
    wrappingComponent?: React.FC<{
      children: React.ReactNode;
    }>;
    attachTo?: HTMLElement;
  }
) => {
  const { mountArgs, lensStore, deps } = getMountWithProviderParams(component, store, options);

  let instance: ReactWrapper = {} as ReactWrapper;

  act(() => {
    instance = mount(mountArgs.component, mountArgs.options);
  });
  return { instance, lensStore, deps };
};

export const getMountWithProviderParams = (
  component: React.ReactElement,
  store?: MountStoreProps,
  options?: {
    wrappingComponent?: React.FC<{
      children: React.ReactNode;
    }>;
    attachTo?: HTMLElement;
  }
) => {
  const { store: lensStore, deps } = makeLensStore(store || {});

  let wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => <Provider store={lensStore}>{children}</Provider>;

  let restOptions: {
    attachTo?: HTMLElement | undefined;
  } = {};
  if (options) {
    const { wrappingComponent: _wrappingComponent, ...rest } = options;
    restOptions = rest;

    if (_wrappingComponent) {
      wrappingComponent = ({ children }) => {
        return _wrappingComponent({
          children: <Provider store={lensStore}>{children}</Provider>,
        });
      };
    }
  }

  const mountArgs = {
    component,
    options: {
      wrappingComponent,
      ...restOptions,
    } as unknown as ReactWrapper,
  };

  return { mountArgs, lensStore, deps };
};
