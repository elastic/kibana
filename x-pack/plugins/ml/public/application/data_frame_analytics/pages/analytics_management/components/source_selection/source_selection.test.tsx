/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { getDataViewAndSavedSearch, DataViewAndSavedSearch } from '../../../../../util/index_utils';

import { SourceSelection } from './source_selection';

jest.mock('../../../../../../../../../../src/plugins/saved_objects/public', () => {
  const SavedObjectFinderUi = ({
    onChoose,
  }: {
    onChoose: (id: string, type: string, fullName: string, savedObject: object) => void;
  }) => {
    return (
      <>
        <button
          onClick={() =>
            onChoose('the-remote-index-pattern-id', 'index-pattern', 'the-full-name', {
              attributes: { title: 'my_remote_cluster:index-pattern-title' },
            })
          }
        >
          RemoteIndexPattern
        </button>
        <button
          onClick={() =>
            onChoose('the-plain-index-pattern-id', 'index-pattern', 'the-full-name', {
              attributes: { title: 'index-pattern-title' },
            })
          }
        >
          PlainIndexPattern
        </button>
        <button
          onClick={() =>
            onChoose('the-remote-saved-search-id', 'search', 'the-full-name', {
              attributes: { title: 'the-remote-saved-search-title' },
            })
          }
        >
          RemoteSavedSearch
        </button>
        <button
          onClick={() =>
            onChoose('the-plain-saved-search-id', 'search', 'the-full-name', {
              attributes: { title: 'the-plain-saved-search-title' },
            })
          }
        >
          PlainSavedSearch
        </button>
      </>
    );
  };

  return {
    SavedObjectFinderUi,
  };
});

const mockNavigateToPath = jest.fn();
jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      savedObjects: {},
      uiSettings: {},
    },
  }),
  useNavigateToPath: () => mockNavigateToPath,
  useNotifications: () => {
    return {
      toasts: { addSuccess: jest.fn(), addDanger: jest.fn(), addError: jest.fn() },
    };
  },
}));

jest.mock('../../../../../util/index_utils', () => {
  return {
    getDataViewAndSavedSearch: jest.fn(async (id: string): Promise<DataViewAndSavedSearch> => {
      return {
        dataView: {
          // @ts-expect-error fields should not be empty
          fields: [],
          title:
            id === 'the-remote-saved-search-id'
              ? 'my_remote_cluster:index-pattern-title'
              : 'index-pattern-title',
        },
        savedSearch: null,
      };
    }),
    isCcsIndexPattern: (a: string) => a.includes(':'),
  };
});

const mockGetDataViewAndSavedSearch = getDataViewAndSavedSearch as jest.Mock;

describe('Data Frame Analytics: <SourceSelection />', () => {
  afterEach(() => {
    mockNavigateToPath.mockClear();
    mockGetDataViewAndSavedSearch.mockClear();
  });

  it('renders the title text', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection />
      </IntlProvider>
    );

    // assert
    expect(mockNavigateToPath).toHaveBeenCalledTimes(0);
    expect(mockGetDataViewAndSavedSearch).toHaveBeenCalledTimes(0);
  });

  it('shows the error callout when clicking a remote data view', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('RemoteIndexPattern', { selector: 'button' }));
    await waitFor(() => screen.getByTestId('analyticsCreateSourceIndexModalCcsErrorCallOut'));

    // assert
    expect(
      screen.queryByText('Data views using cross-cluster search are not supported.')
    ).toBeInTheDocument();
    expect(mockNavigateToPath).toHaveBeenCalledTimes(0);
    expect(mockGetDataViewAndSavedSearch).toHaveBeenCalledTimes(0);
  });

  it('calls navigateToPath for a plain data view ', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('PlainIndexPattern', { selector: 'button' }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByText('Data views using cross-cluster search are not supported.')
      ).not.toBeInTheDocument();
      expect(mockNavigateToPath).toHaveBeenCalledWith(
        '/data_frame_analytics/new_job?index=the-plain-index-pattern-id'
      );
      expect(mockGetDataViewAndSavedSearch).toHaveBeenCalledTimes(0);
    });
  });

  it('shows the error callout when clicking a saved search using a remote data view', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('RemoteSavedSearch', { selector: 'button' }));
    await waitFor(() => screen.getByTestId('analyticsCreateSourceIndexModalCcsErrorCallOut'));

    // assert
    expect(
      screen.queryByText('Data views using cross-cluster search are not supported.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        `The saved search 'the-remote-saved-search-title' uses the data view 'my_remote_cluster:index-pattern-title'.`
      )
    ).toBeInTheDocument();
    expect(mockNavigateToPath).toHaveBeenCalledTimes(0);
    expect(mockGetDataViewAndSavedSearch).toHaveBeenCalledWith('the-remote-saved-search-id');
  });

  it('calls navigateToPath for a saved search using a plain data view ', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('PlainSavedSearch', { selector: 'button' }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByText('Data views using cross-cluster search are not supported.')
      ).not.toBeInTheDocument();
      expect(mockNavigateToPath).toHaveBeenCalledWith(
        '/data_frame_analytics/new_job?savedSearchId=the-plain-saved-search-id'
      );
      expect(mockGetDataViewAndSavedSearch).toHaveBeenCalledWith('the-plain-saved-search-id');
    });
  });
});
