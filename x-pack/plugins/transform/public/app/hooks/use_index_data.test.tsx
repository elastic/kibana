/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { render, wait } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';

import { CoreSetup } from 'src/core/public';

import { DataGrid, UseIndexDataReturnType, INDEX_STATUS } from '../../shared_imports';

import { SimpleQuery } from '../common';

import { SearchItems } from './use_search_items';
import { useIndexData } from './use_index_data';

jest.mock('../../shared_imports');
jest.mock('../app_dependencies');
jest.mock('./use_api');

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

describe('Transform: useIndexData()', () => {
  test('indexPattern set triggers loading', async (done) => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useIndexData(
        ({
          id: 'the-id',
          title: 'the-title',
          fields: [],
        } as unknown) as SearchItems['indexPattern'],
        query
      )
    );
    const IndexObj: UseIndexDataReturnType = result.current;

    await waitForNextUpdate();

    expect(IndexObj.errorMessage).toBe('');
    expect(IndexObj.status).toBe(INDEX_STATUS.LOADING);
    expect(IndexObj.tableItems).toEqual([]);
    done();
  });
});

describe('Transform: <DataGrid /> with useIndexData()', () => {
  // Using the async/await wait()/done() pattern to avoid act() errors.
  test('Minimal initialization', async (done) => {
    // Arrange
    const indexPattern = {
      title: 'the-index-pattern-title',
      fields: [] as any[],
    } as SearchItems['indexPattern'];

    const Wrapper = () => {
      const props = {
        ...useIndexData(indexPattern, { match_all: {} }),
        copyToClipboard: 'the-copy-to-clipboard-code',
        copyToClipboardDescription: 'the-copy-to-clipboard-description',
        dataTestSubj: 'the-data-test-subj',
        title: 'the-index-preview-title',
        toastNotifications: {} as CoreSetup['notifications']['toasts'],
      };

      return <DataGrid {...props} />;
    };
    const { getByText } = render(<Wrapper />);

    // Act
    // Assert
    expect(getByText('the-index-preview-title')).toBeInTheDocument();
    await wait();
    done();
  });
});
