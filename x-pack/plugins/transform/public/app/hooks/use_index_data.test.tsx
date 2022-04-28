/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';

import { CoreSetup } from '@kbn/core/public';

import { getMlSharedImports, UseIndexDataReturnType } from '../../shared_imports';

import { SimpleQuery } from '../common';

import { SearchItems } from './use_search_items';
import { useIndexData } from './use_index_data';

jest.mock('../../shared_imports');
jest.mock('../app_dependencies');
jest.mock('./use_api');

import { useAppDependencies } from '../__mocks__/app_dependencies';
import { MlSharedContext } from '../__mocks__/shared_context';
import { RuntimeField } from '@kbn/data-plugin/common';

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

const runtimeMappings = {
  rt_bytes_bigger: {
    type: 'double',
    script: {
      source: "emit(doc['bytes'].value * 2.0)",
    },
  } as RuntimeField,
};

describe('Transform: useIndexData()', () => {
  test('dataView set triggers loading', async () => {
    const mlShared = await getMlSharedImports();
    const wrapper: FC = ({ children }) => (
      <IntlProvider locale="en">
        <MlSharedContext.Provider value={mlShared}>{children}</MlSharedContext.Provider>
      </IntlProvider>
    );

    const { result, waitForNextUpdate } = renderHook(
      () =>
        useIndexData(
          {
            id: 'the-id',
            title: 'the-title',
            fields: [],
          } as unknown as SearchItems['dataView'],
          query,
          runtimeMappings
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
  test('Minimal initialization, no cross cluster search warning.', async () => {
    // Arrange
    const dataView = {
      title: 'the-data-view-title',
      fields: [] as any[],
    } as SearchItems['dataView'];

    const mlSharedImports = await getMlSharedImports();

    const Wrapper = () => {
      const {
        ml: { DataGrid },
      } = useAppDependencies();
      const props = {
        ...useIndexData(dataView, { match_all: {} }, runtimeMappings),
        copyToClipboard: 'the-copy-to-clipboard-code',
        copyToClipboardDescription: 'the-copy-to-clipboard-description',
        dataTestSubj: 'the-data-test-subj',
        title: 'the-index-preview-title',
        toastNotifications: {} as CoreSetup['notifications']['toasts'],
      };

      return <DataGrid {...props} />;
    };

    render(
      <IntlProvider locale="en">
        <MlSharedContext.Provider value={mlSharedImports}>
          <Wrapper />
        </MlSharedContext.Provider>
      </IntlProvider>
    );

    // Act
    // Assert
    await waitFor(() => {
      expect(screen.queryByText('the-index-preview-title')).toBeInTheDocument();
      expect(
        screen.queryByText('Cross-cluster search returned no fields data.')
      ).not.toBeInTheDocument();
    });
  });

  test('Cross-cluster search warning', async () => {
    // Arrange
    const dataView = {
      title: 'remote:the-index-pattern-title',
      fields: [] as any[],
    } as SearchItems['dataView'];

    const mlSharedImports = await getMlSharedImports();

    const Wrapper = () => {
      const {
        ml: { DataGrid },
      } = useAppDependencies();
      const props = {
        ...useIndexData(dataView, { match_all: {} }, runtimeMappings),
        copyToClipboard: 'the-copy-to-clipboard-code',
        copyToClipboardDescription: 'the-copy-to-clipboard-description',
        dataTestSubj: 'the-data-test-subj',
        title: 'the-index-preview-title',
        toastNotifications: {} as CoreSetup['notifications']['toasts'],
      };

      return <DataGrid {...props} />;
    };

    render(
      <IntlProvider locale="en">
        <MlSharedContext.Provider value={mlSharedImports}>
          <Wrapper />
        </MlSharedContext.Provider>
      </IntlProvider>
    );

    // Act
    // Assert
    await waitFor(() => {
      expect(screen.queryByText('the-index-preview-title')).toBeInTheDocument();
      expect(
        screen.queryByText('Cross-cluster search returned no fields data.')
      ).toBeInTheDocument();
    });
  });
});
