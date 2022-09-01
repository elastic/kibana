/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SearchBarComponent } from '.';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { createStore } from '../../store';
import { inputsActions } from '../../store/inputs';
import { InputsModelId } from '../../store/inputs/constants';

const mockSetAppFilters = jest.fn();
const mockFilterManager = new FilterManager(coreMock.createStart().uiSettings);
mockFilterManager.setAppFilters = mockSetAppFilters;
jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');
  return {
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        data: {
          ...original.useKibana().services.data,
          query: {
            ...original.useKibana().services.data.query,
            filterManager: mockFilterManager,
          },
        },
        unifiedSearch: {
          ui: {
            SearchBar: jest.fn().mockImplementation((props) => (
              <button
                data-test-subj="querySubmitButton"
                onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
                type="button"
              >
                {'Hello world'}
              </button>
            )),
          },
        },
      },
    }),
  };
});

const mockUpdateUrlParam = jest.fn();
jest.mock('../../utils/global_query_string', () => ({
  useUpdateUrlParam: () => mockUpdateUrlParam,
}));

describe('SearchBarComponent', () => {
  const props = {
    id: InputsModelId.global as const,
    indexPattern: {
      fields: [],
      title: '',
    },
    updateSearch: jest.fn(),
    setSavedQuery: jest.fn(),
    setSearchBarFilter: jest.fn(),
    end: '',
    start: '',
    toStr: '',
    fromStr: '',
    isLoading: false,
    filterQuery: {
      query: '',
      language: '',
    },
    queries: [],
    savedQuery: undefined,
  };

  const pollForSignalIndex = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls pollForSignalIndex on Refresh button click', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchBarComponent {...props} pollForSignalIndex={pollForSignalIndex} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('querySubmitButton'));
    expect(pollForSignalIndex).toHaveBeenCalled();
  });

  it('does not call pollForSignalIndex on Refresh button click if pollForSignalIndex not passed', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchBarComponent {...props} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('querySubmitButton'));
    expect(pollForSignalIndex).not.toHaveBeenCalled();
  });

  it('calls useUpdateUrlParam for filter and query', () => {
    const query = { query: 'testQuery', language: 'kuery' };
    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'phrase',
          key: 'host.name',
        },
        query: { match_phrase: { 'host.name': 'testValue' } },
      },
    ];

    const state = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          filters,
          query,
        },
      },
    };

    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    expect(mockUpdateUrlParam).toHaveBeenCalledWith(filters);
    expect(mockUpdateUrlParam).toHaveBeenCalledWith(query);
    // For updateSavedQueryUrlParam
    expect(mockUpdateUrlParam).toHaveBeenCalledWith(null);
  });

  it('calls useUpdateUrlParam for savedQuery', () => {
    const savedQuery: SavedQuery = {
      id: 'testSavedquery',
      attributes: {
        title: 'testtitle',
        description: 'testDescription',
        query: { query: 'testQuery', language: 'kuery' },
      },
    };

    const state = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          savedQuery,
        },
      },
    };

    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    // For filters and query
    expect(mockUpdateUrlParam).toHaveBeenNthCalledWith(2, null);
    expect(mockUpdateUrlParam).toHaveBeenCalledWith(savedQuery.id);
  });

  it('calls useUpdateUrlParam when query query changes', async () => {
    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    jest.clearAllMocks();
    const newQuery = { query: 'testQuery', language: 'new testLanguage' };

    store.dispatch(
      inputsActions.setFilterQuery({
        id: InputsModelId.global,
        ...newQuery,
      })
    );

    await waitFor(() => {
      expect(mockUpdateUrlParam).toHaveBeenCalledWith(newQuery);
    });
  });

  it('calls useUpdateUrlParam when filters change', async () => {
    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    jest.clearAllMocks();
    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'phrase',
          key: 'host.name',
        },
        query: { match_phrase: { 'host.name': 'testValue' } },
      },
    ];

    store.dispatch(
      inputsActions.setSearchBarFilter({
        id: InputsModelId.global,
        filters,
      })
    );

    await waitFor(() => {
      expect(mockUpdateUrlParam).toHaveBeenCalledWith(filters);
    });
  });

  it('calls useUpdateUrlParam when savedQuery changes', async () => {
    const { storage } = createSecuritySolutionStorageMock();
    const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    jest.clearAllMocks();
    const savedQuery: SavedQuery = {
      id: 'testSavedQuery123',
      attributes: {
        title: 'testtitle',
        description: 'testDescription',
        query: { query: 'testQuery', language: 'kuery' },
      },
    };

    store.dispatch(
      inputsActions.setSavedQuery({
        id: InputsModelId.global,
        savedQuery,
      })
    );

    await waitFor(() => {
      expect(mockUpdateUrlParam).toHaveBeenCalledWith(savedQuery.id);
    });
  });

  describe('Timerange', () => {
    it('calls useUpdateUrlParam when global timerange changes', async () => {
      const { storage } = createSecuritySolutionStorageMock();
      const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      render(
        <TestProviders store={store}>
          <SearchBarComponent {...props} />
        </TestProviders>
      );

      jest.clearAllMocks();

      const newTimerange = {
        from: '2020-07-07T08:20:18.966Z',
        fromStr: 'now-24h',
        kind: 'relative',
        to: '2020-07-08T08:20:18.966Z',
        toStr: 'now',
      };

      store.dispatch(
        inputsActions.setRelativeRangeDatePicker({ id: InputsModelId.global, ...newTimerange })
      );

      await waitFor(() => {
        expect(mockUpdateUrlParam).toHaveBeenCalledWith(
          expect.objectContaining({
            global: {
              linkTo: [InputsModelId.timeline, InputsModelId.socTrends],
              timerange: newTimerange,
            },
          })
        );
      });
    });

    it('calls useUpdateUrlParam when timeline timerange changes', async () => {
      const { storage } = createSecuritySolutionStorageMock();
      const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      render(
        <TestProviders store={store}>
          <SearchBarComponent {...props} />
        </TestProviders>
      );

      jest.clearAllMocks();

      const newTimerange = {
        from: '2020-07-07T08:20:18.966Z',
        fromStr: 'now-24h',
        kind: 'relative',
        to: '2020-07-08T08:20:18.966Z',
        toStr: 'now',
      };

      store.dispatch(
        inputsActions.setRelativeRangeDatePicker({
          id: InputsModelId.timeline,
          ...newTimerange,
        })
      );

      await waitFor(() => {
        expect(mockUpdateUrlParam).toHaveBeenCalledWith(
          expect.objectContaining({
            timeline: {
              linkTo: [InputsModelId.global, InputsModelId.socTrends],
              timerange: newTimerange,
            },
          })
        );
      });
    });

    it('initializes timerange URL param with redux date on mount', async () => {
      const { storage } = createSecuritySolutionStorageMock();
      const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      jest.clearAllMocks();
      render(
        <TestProviders store={store}>
          <SearchBarComponent {...props} />
        </TestProviders>
      );

      expect(mockUpdateUrlParam.mock.calls[3]).toEqual([
        {
          global: {
            timerange: mockGlobalState.inputs.global.timerange,
            linkTo: mockGlobalState.inputs.global.linkTo,
          },
          timeline: {
            timerange: mockGlobalState.inputs.timeline.timerange,
            linkTo: mockGlobalState.inputs.timeline.linkTo,
          },
        },
      ]);
    });
  });
});
