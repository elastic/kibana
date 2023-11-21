/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { processMock } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { SessionViewSearchBar } from '.';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';

describe('SessionViewSearchBar component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let props = {
    searchQuery: 'ls',
    totalMatches: 0,
    onNext: jest.fn((query) => query),
    onPrevious: jest.fn((query) => query),
    setSearchQuery: jest.fn((query) => query),
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    props = {
      searchQuery: 'ls',
      totalMatches: 0,
      onNext: jest.fn((query) => query),
      onPrevious: jest.fn((query) => query),
      setSearchQuery: jest.fn((query) => query),
    };
  });

  it('handles a typed search query', async () => {
    renderResult = mockedContext.render(<SessionViewSearchBar {...props} />);

    const searchInput = renderResult.getByTestId('sessionView:searchBar').querySelector('input');

    expect(searchInput?.value).toEqual('ls');

    if (searchInput) {
      userEvent.type(searchInput, ' -la');
      fireEvent.keyUp(searchInput, { key: 'Enter', code: 'Enter' });
    }

    expect(searchInput?.value).toEqual('ls -la');
    expect(props.setSearchQuery.mock.calls.length).toBe(1);
    expect(props.setSearchQuery.mock.results[0].value).toBe('ls -la');
  });

  it('shows a results navigator when searchResults provided', async () => {
    const processMock2 = { ...processMock };
    const processMock3 = { ...processMock };
    const mockResults = [processMock, processMock2, processMock3];

    renderResult = mockedContext.render(
      <SessionViewSearchBar {...props} totalMatches={mockResults.length} />
    );

    const searchPagination = renderResult.getByTestId('sessionView:searchPagination');
    expect(searchPagination).toBeTruthy();

    const paginationTextClass = '.euiPagination__compressedText';
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('1 of 3');

    userEvent.click(renderResult.getByTestId('pagination-button-next'));
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('2 of 3');

    userEvent.click(renderResult.getByTestId('pagination-button-next'));
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('3 of 3');

    // ensure clicking next after we reach the end doesn't cause a 4 of 3 situation.
    userEvent.click(renderResult.getByTestId('pagination-button-next'));
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('3 of 3');

    userEvent.click(renderResult.getByTestId('pagination-button-previous'));
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('2 of 3');

    const searchInput = renderResult.getByTestId('sessionView:searchBar').querySelector('input');

    if (searchInput) {
      userEvent.type(searchInput, ' -la');
      fireEvent.keyUp(searchInput, { key: 'Enter', code: 'Enter' });
    }

    // after search is changed, results index should reset to 1
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('1 of 3');

    expect(props.onNext.mock.calls.length).toBe(2);
    expect(props.onPrevious.mock.calls.length).toBe(1);
    expect(props.onPrevious.mock.results[0].value).toEqual(1); // e.g 2 of 3, 1 because index is zero based.
  });
});
