/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { processMock } from '../../../common/mocks/constants/session_view_process.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { SessionViewSearchBar } from './index';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/dom';

describe('SessionViewSearchBar component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  it('handles a typed search query', async () => {
    const mockSetSearchQuery = jest.fn((query) => query);
    const mockOnProcessSelected = jest.fn((process) => process);

    renderResult = mockedContext.render(
      <SessionViewSearchBar
        searchQuery="ls"
        searchResults={[]}
        onProcessSelected={mockOnProcessSelected}
        setSearchQuery={mockSetSearchQuery}
      />
    );

    const searchInput = renderResult.getByTestId('sessionView:searchInput').querySelector('input');

    expect(searchInput?.value).toEqual('ls');

    if (searchInput) {
      userEvent.type(searchInput, ' -la');
      fireEvent.keyUp(searchInput, { key: 'Enter', code: 'Enter' });
    }

    expect(searchInput?.value).toEqual('ls -la');
    expect(mockSetSearchQuery.mock.calls.length).toBe(1);
    expect(mockSetSearchQuery.mock.results[0].value).toBe('ls -la');
  });

  it('shows a results navigator when searchResults provided', async () => {
    const processMock2 = { ...processMock };
    const processMock3 = { ...processMock };
    const mockResults = [processMock, processMock2, processMock3];
    const mockSetSearchQuery = jest.fn((query) => query);
    const mockOnProcessSelected = jest.fn((process) => process);

    renderResult = mockedContext.render(
      <SessionViewSearchBar
        searchQuery="ls"
        searchResults={mockResults}
        onProcessSelected={mockOnProcessSelected}
        setSearchQuery={mockSetSearchQuery}
      />
    );

    const searchPagination = renderResult.getByTestId('sessionView:searchPagination');
    expect(searchPagination).toBeTruthy();

    const paginationTextClass = '.euiPagination__compressedText';
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('1 of 3');

    userEvent.click(renderResult.getByTestId('pagination-button-next'));
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('2 of 3');

    const searchInput = renderResult.getByTestId('sessionView:searchInput').querySelector('input');

    if (searchInput) {
      userEvent.type(searchInput, ' -la');
      fireEvent.keyUp(searchInput, { key: 'Enter', code: 'Enter' });
    }

    // after search is changed, results index should reset to 1
    expect(searchPagination.querySelector(paginationTextClass)?.textContent).toEqual('1 of 3');

    // setSelectedProcess should be called 3 times:
    // 1. searchResults is set so auto select first item
    // 2. next button hit, so call with 2nd item
    // 3. search changed, so call with first result.
    expect(mockOnProcessSelected.mock.calls.length).toBe(3);
    expect(mockOnProcessSelected.mock.results[0].value).toEqual(processMock);
    expect(mockOnProcessSelected.mock.results[1].value).toEqual(processMock2);
    expect(mockOnProcessSelected.mock.results[1].value).toEqual(processMock);
  });
});
