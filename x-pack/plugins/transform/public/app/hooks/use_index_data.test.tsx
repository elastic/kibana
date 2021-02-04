/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';

import { CoreSetup } from 'src/core/public';

import { getMlSharedImports, UseIndexDataReturnType } from '../../shared_imports';

import { SimpleQuery } from '../common';

import { SearchItems } from './use_search_items';
import { useIndexData } from './use_index_data';

jest.mock('../../shared_imports');
jest.mock('../app_dependencies');
jest.mock('./use_api');

import { useAppDependencies } from '../__mocks__/app_dependencies';
import { MlSharedContext } from '../__mocks__/shared_context';

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

describe('Transform: useIndexData()', () => {
  test('indexPattern set triggers loading', async () => {
    const mlShared = await getMlSharedImports();
    const wrapper: FC = ({ children }) => (
      <MlSharedContext.Provider value={mlShared}>{children}</MlSharedContext.Provider>
    );

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useIndexData(
          ({
            id: 'the-id',
            title: 'the-title',
            fields: [],
          } as unknown) as SearchItems['indexPattern'],
          query
        ),
      { wrapper }
    );
    const IndexObj: UseIndexDataReturnType = result.current;

    await waitForNextUpdate();

    expect(IndexObj.errorMessage).toBe('');
    expect(IndexObj.status).toBe(1);
    expect(IndexObj.tableItems).toEqual([]);
  });
});

describe('Transform: <DataGrid /> with useIndexData()', () => {
  test('Minimal initialization', async () => {
    // Arrange
    const indexPattern = {
      title: 'the-index-pattern-title',
      fields: [] as any[],
    } as SearchItems['indexPattern'];

    const mlSharedImports = await getMlSharedImports();

    const Wrapper = () => {
      const {
        ml: { DataGrid },
      } = useAppDependencies();
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
    const { getByText } = render(
      <MlSharedContext.Provider value={mlSharedImports}>
        <Wrapper />
      </MlSharedContext.Provider>
    );

    // Act
    // Assert
    expect(getByText('the-index-preview-title')).toBeInTheDocument();
  });
});
