/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { InputsModelId } from '../../store/inputs/constants';
import { SearchBarComponent } from '.';
import { TestProviders } from '../../mock';
import { FilterManager } from '../../../../../../../src/plugins/data/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';

const mockFilterManager = new FilterManager(coreMock.createStart().uiSettings);
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

describe('SearchBarComponent', () => {
  const props = {
    id: 'global' as InputsModelId,
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

  it('calls setSearchBarFilter on mount', () => {
    render(
      <TestProviders>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    expect(props.setSearchBarFilter).toHaveBeenCalled();
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
});
