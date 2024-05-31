/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { SourcesPanelForStartChat } from './sources_panel_for_start_chat';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';
import { useQueryIndices } from '../../hooks/use_query_indices';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_source_indices_field', () => ({
  useSourceIndicesFields: jest.fn(),
}));
jest.mock('../../hooks/use_query_indices', () => ({
  useQueryIndices: jest.fn(),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    services: {
      application: { navigateToUrl: jest.fn() },
      share: { url: { locators: { get: jest.fn() } } },
    },
  })),
}));

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <>
      <IntlProvider locale="en">{children}</IntlProvider>
    </>
  );
};

describe('SourcesPanelForStartChat component', () => {
  afterEach(jest.clearAllMocks);

  it('shows a loading spinner when query is loading', () => {
    (useQueryIndices as jest.Mock).mockReturnValue({ indices: [], isLoading: true });
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: [],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
    });

    render(<SourcesPanelForStartChat />, { wrapper: Wrapper });
    expect(screen.getByTestId('indicesLoading')).toBeInTheDocument();
  });

  it('shows the "AddIndicesField" component when there are indices and not loading', () => {
    (useQueryIndices as jest.Mock).mockReturnValue({ indices: ['index1'], isLoading: false });
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: [],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
    });

    render(<SourcesPanelForStartChat />, { wrapper: Wrapper });
    expect(screen.queryByTestId('indicesLoading')).not.toBeInTheDocument();
  });

  it('displays IndicesTable when there are selected indices', () => {
    (useQueryIndices as jest.Mock).mockReturnValue({ indices: ['index1'], isLoading: false });
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: ['index1'],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
    });

    render(<SourcesPanelForStartChat />, { wrapper: Wrapper });
    expect(screen.getAllByText('index1')).toHaveLength(1);
    expect(screen.getByTestId('removeIndexButton')).toBeInTheDocument();
  });

  it('displays "CreateIndexCallout" when no indices are found and not loading', () => {
    (useQueryIndices as jest.Mock).mockReturnValue({ indices: [], isLoading: false });
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: [],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
    });

    render(<SourcesPanelForStartChat />, { wrapper: Wrapper });
    expect(screen.getByTestId('createIndexCallout')).toBeInTheDocument();
  });

  it('renders warning callout', () => {
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: ['index1'],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
      noFieldsIndicesWarning: 'index1',
    });

    render(<SourcesPanelForStartChat />, { wrapper: Wrapper });
    expect(screen.getByTestId('NoIndicesFieldsMessage')).toBeInTheDocument();
    expect(screen.getByTestId('NoIndicesFieldsMessage')).toHaveTextContent('index1');
  });
});
