/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

import { IntlProvider } from 'react-intl';

import {
  getIndexPatternAndSavedSearch,
  IndexPatternAndSavedSearch,
} from '../../../../../util/index_utils';

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
}));

jest.mock('../../../../../util/index_utils', () => {
  return {
    getIndexPatternAndSavedSearch: jest.fn(
      async (id: string): Promise<IndexPatternAndSavedSearch> => {
        return {
          indexPattern: {
            fields: [],
            title:
              id === 'the-remote-saved-search-id'
                ? 'my_remote_cluster:index-pattern-title'
                : 'index-pattern-title',
          },
          savedSearch: null,
        };
      }
    ),
    isCcsIndexPattern: (a: string) => a.includes(':'),
  };
});

const mockOnClose = jest.fn();
const mockGetIndexPatternAndSavedSearch = getIndexPatternAndSavedSearch as jest.Mock;

describe('Data Frame Analytics: <SourceSelection />', () => {
  afterEach(() => {
    mockNavigateToPath.mockClear();
    mockGetIndexPatternAndSavedSearch.mockClear();
  });

  it('renders the title text', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection onClose={mockOnClose} />
      </IntlProvider>
    );

    // assert
    expect(screen.queryByText('New analytics job')).toBeInTheDocument();
    expect(mockNavigateToPath).toHaveBeenCalledTimes(0);
    expect(mockGetIndexPatternAndSavedSearch).toHaveBeenCalledTimes(0);
  });

  it('shows the error callout when clicking a remote index pattern', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection onClose={mockOnClose} />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('RemoteIndexPattern', { selector: 'button' }));
    await waitFor(() => screen.getByTestId('analyticsCreateSourceIndexModalCcsErrorCallOut'));

    // assert
    expect(
      screen.queryByText('Index patterns using cross-cluster search are not supported.')
    ).toBeInTheDocument();
    expect(mockNavigateToPath).toHaveBeenCalledTimes(0);
    expect(mockGetIndexPatternAndSavedSearch).toHaveBeenCalledTimes(0);
  });

  it('calls navigateToPath for a plain index pattern ', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection onClose={mockOnClose} />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('PlainIndexPattern', { selector: 'button' }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByText('Index patterns using cross-cluster search are not supported.')
      ).not.toBeInTheDocument();
      expect(mockNavigateToPath).toHaveBeenCalledWith(
        '/data_frame_analytics/new_job?index=the-plain-index-pattern-id'
      );
      expect(mockGetIndexPatternAndSavedSearch).toHaveBeenCalledTimes(0);
    });
  });

  it('shows the error callout when clicking a saved search using a remote index pattern', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection onClose={mockOnClose} />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('RemoteSavedSearch', { selector: 'button' }));
    await waitFor(() => screen.getByTestId('analyticsCreateSourceIndexModalCcsErrorCallOut'));

    // assert
    expect(
      screen.queryByText('Index patterns using cross-cluster search are not supported.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        `The saved search 'the-remote-saved-search-title' uses the index pattern 'my_remote_cluster:index-pattern-title'.`
      )
    ).toBeInTheDocument();
    expect(mockNavigateToPath).toHaveBeenCalledTimes(0);
    expect(mockGetIndexPatternAndSavedSearch).toHaveBeenCalledWith('the-remote-saved-search-id');
  });

  it('calls navigateToPath for a saved search using a plain index pattern ', async () => {
    // prepare
    render(
      <IntlProvider locale="en">
        <SourceSelection onClose={mockOnClose} />
      </IntlProvider>
    );

    // act
    fireEvent.click(screen.getByText('PlainSavedSearch', { selector: 'button' }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByText('Index patterns using cross-cluster search are not supported.')
      ).not.toBeInTheDocument();
      expect(mockNavigateToPath).toHaveBeenCalledWith(
        '/data_frame_analytics/new_job?savedSearchId=the-plain-saved-search-id'
      );
      expect(mockGetIndexPatternAndSavedSearch).toHaveBeenCalledWith('the-plain-saved-search-id');
    });
  });
});
