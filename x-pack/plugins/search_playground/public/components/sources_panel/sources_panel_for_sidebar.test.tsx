/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { SourcesPanelSidebar } from './sources_panel_sidebar';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';
import { useQueryIndices } from '../../hooks/use_query_indices';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_source_indices_field', () => ({
  useSourceIndicesFields: jest.fn(),
}));
jest.mock('../../hooks/use_query_indices', () => ({
  useQueryIndices: jest.fn(),
}));

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <>
      <IntlProvider locale="en">{children}</IntlProvider>
    </>
  );
};

describe('SourcesPanelSidebar component', () => {
  afterEach(jest.clearAllMocks);

  it('shows the "AddIndicesField" component when there are indices and not loading', () => {
    (useQueryIndices as jest.Mock).mockReturnValue({ indices: ['index1'], isLoading: false });
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: [],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
    });

    render(<SourcesPanelSidebar />, { wrapper: Wrapper });
    expect(screen.queryByTestId('indicesLoading')).not.toBeInTheDocument();
  });

  it('displays IndicesTable when there are selected indices', () => {
    (useQueryIndices as jest.Mock).mockReturnValue({ indices: ['index1'], isLoading: false });
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: ['index1', 'index2'],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
    });

    render(<SourcesPanelSidebar />, { wrapper: Wrapper });
    expect(screen.getAllByTestId('removeIndexButton')).toHaveLength(2);
    expect(screen.getAllByTestId('removeIndexButton')[0]).not.toBeDisabled();
    expect(screen.getAllByTestId('removeIndexButton')[1]).not.toBeDisabled();
  });

  it('does not allow to remove all indices', () => {
    (useQueryIndices as jest.Mock).mockReturnValue({ indices: ['index1'], isLoading: false });
    (useSourceIndicesFields as jest.Mock).mockReturnValue({
      indices: ['index1'],
      removeIndex: jest.fn(),
      addIndex: jest.fn(),
      loading: false,
    });

    render(<SourcesPanelSidebar />, { wrapper: Wrapper });
    expect(screen.getByTestId('removeIndexButton')).toBeDisabled();
  });
});
