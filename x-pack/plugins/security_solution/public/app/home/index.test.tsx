/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { HomePage } from '.';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';
import { CONSTANTS } from '../../common/components/url_state/constants';

import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../common/mock';
import { inputsActions } from '../../common/store/inputs';
import { setSearchBarFilter } from '../../common/store/inputs/actions';
import { coreMock } from '@kbn/core/public/mocks';
import type { Filter } from '@kbn/es-query';
import { createStore } from '../../common/store';

jest.mock('../../common/store/inputs/actions');

const DummyComponent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const mockedUseInitializeUrlParam = jest.fn();

const mockUseInitializeUrlParam = (urlParamKey: string, state: unknown) => {
  mockedUseInitializeUrlParam.mockImplementation((key, fn) => {
    if (urlParamKey === key) {
      fn(state);
    }
  });
};

jest.mock('../../common/utils/global_query_string', () => {
  const original = jest.requireActual('../../common/utils/global_query_string');
  return {
    ...original,
    useInitializeUrlParam: (...params: unknown[]) => mockedUseInitializeUrlParam(...params),
    useSyncGlobalQueryString: jest.fn(),
  };
});

jest.mock('../../common/components/drag_and_drop/drag_drop_context_wrapper', () => ({
  DragDropContextWrapper: DummyComponent,
}));
jest.mock('./template_wrapper', () => ({
  SecuritySolutionTemplateWrapper: DummyComponent,
}));

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ pathname: '/test', search: '?' }),
  };
});

const mockedFilterManager = new FilterManager(coreMock.createStart().uiSettings);
const mockGetSavedQuery = jest.fn();

const dummyFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'dummy',
    params: {
      query: 'value',
    },
  },
  query: {
    term: {
      dummy: 'value',
    },
  },
};

jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        data: {
          ...original.useKibana().services.data,
          query: {
            ...original.useKibana().services.data.query,
            filterManager: mockedFilterManager,
            savedQueries: { getSavedQuery: mockGetSavedQuery },
          },
        },
      },
    }),
  };
});

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFilterManager.setFilters([]);
  });

  it('calls useInitializeUrlParam for appQuery, filters and savedQuery', () => {
    render(
      <TestProviders>
        <HomePage onAppLeave={jest.fn()} setHeaderActionMenu={jest.fn()}>
          <span />
        </HomePage>
      </TestProviders>
    );

    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      CONSTANTS.appQuery,
      expect.any(Function)
    );
    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      CONSTANTS.filters,
      expect.any(Function)
    );
    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      CONSTANTS.savedQuery,
      expect.any(Function)
    );
  });

  it('dispatches setFilterQuery when initializing appQuery', () => {
    const state = { query: 'testQuery', language: 'en' };
    mockUseInitializeUrlParam(CONSTANTS.appQuery, state);

    render(
      <TestProviders>
        <HomePage onAppLeave={jest.fn()} setHeaderActionMenu={jest.fn()}>
          <span />
        </HomePage>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      inputsActions.setFilterQuery({
        id: 'global',
        query: state.query,
        language: state.language,
      })
    );
  });

  it('initializes saved query store', async () => {
    const state = 'test-query-id';
    const savedQueryData: SavedQuery = {
      id: 'testSavedquery',
      attributes: {
        title: 'testtitle',
        description: 'testDescription',
        query: { query: 'testQuery', language: 'testLanguage' },
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
            },
            query: {},
          },
        ],
      },
    };

    mockGetSavedQuery.mockResolvedValue(savedQueryData);
    mockUseInitializeUrlParam(CONSTANTS.savedQuery, state);

    render(
      <TestProviders>
        <HomePage onAppLeave={jest.fn()} setHeaderActionMenu={jest.fn()}>
          <span />
        </HomePage>
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        inputsActions.setSavedQuery({ id: 'global', savedQuery: savedQueryData })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        inputsActions.setFilterQuery({
          id: 'global',
          ...savedQueryData.attributes.query,
        })
      );
      expect(setSearchBarFilter).toHaveBeenCalledWith({
        id: 'global',
        filters: savedQueryData.attributes.filters,
      });
    });
  });

  describe('Filters', () => {
    it('sets filter initial value in the store and filterManager', () => {
      const state = [{ testFilter: 'test' }];
      mockUseInitializeUrlParam(CONSTANTS.filters, state);
      const spySetFilters = jest.spyOn(mockedFilterManager, 'setFilters');

      render(
        <TestProviders>
          <HomePage onAppLeave={jest.fn()} setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(setSearchBarFilter).toHaveBeenCalledWith({
        id: 'global',
        filters: state,
      });

      expect(spySetFilters).toHaveBeenCalledWith(state);
    });

    it('sets filter from store when URL param has no value', () => {
      const state = null;
      mockUseInitializeUrlParam(CONSTANTS.filters, state);
      const spySetAppFilters = jest.spyOn(mockedFilterManager, 'setAppFilters');
      const { storage } = createSecuritySolutionStorageMock();

      const mockstate = {
        ...mockGlobalState,
        inputs: {
          ...mockGlobalState.inputs,
          global: {
            ...mockGlobalState.inputs.global,
            filters: [dummyFilter],
          },
        },
      };

      const mockStore = createStore(mockstate, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      render(
        <TestProviders store={mockStore}>
          <HomePage onAppLeave={jest.fn()} setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(spySetAppFilters).toHaveBeenCalledWith([dummyFilter]);
    });

    it('preserves pinned filters when URL param has no value', () => {
      const state = null;
      mockUseInitializeUrlParam(CONSTANTS.filters, state);
      // pin filter
      mockedFilterManager.setGlobalFilters([dummyFilter]);

      render(
        <TestProviders>
          <HomePage onAppLeave={jest.fn()} setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(mockedFilterManager.getFilters()).toEqual([
        {
          ...dummyFilter,
          $state: {
            store: 'globalState',
          },
        },
      ]);
    });
  });
});
