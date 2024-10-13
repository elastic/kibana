/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { useFetchGraphData } from '../../shared/hooks/use_fetch_graph_data';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { DocumentDetailsContext } from '../../shared/context';
import { GraphPreview } from './graph_preview';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

jest.mock('../../shared/hooks/use_fetch_graph_data', () => ({
  useFetchGraphData: jest.fn(),
}));
const mockUseFetchGraphData = useFetchGraphData as jest.Mock;

const renderGraphPreview = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <GraphPreview />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = 'An error is preventing this alert from being visualized.';

describe('<GraphPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows graph preview correctly when data is loaded', () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: [], edges: [] },
    });

    const { getByTestId } = renderGraphPreview(mockContextValue);

    expect(getByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('shows loading when data is loading', () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: true,
      isError: false,
      data: null,
    });

    const { getByTestId } = renderGraphPreview(mockContextValue);

    expect(getByTestId(GRAPH_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: true,
      data: null,
    });

    const { getByText } = renderGraphPreview(mockContextValue);

    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
