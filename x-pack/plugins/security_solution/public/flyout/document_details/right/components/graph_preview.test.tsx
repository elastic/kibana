/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { DocumentDetailsContext } from '../../shared/context';
import { GraphPreview, type GraphPreviewProps } from './graph_preview';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

const mockGraph = () => <div data-test-subj={GRAPH_PREVIEW_TEST_ID} />;

jest.mock('@kbn/cloud-security-posture-graph', () => {
  return { Graph: mockGraph };
});

const renderGraphPreview = (contextValue: DocumentDetailsContext, props: GraphPreviewProps) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <GraphPreview {...props} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const ERROR_MESSAGE = 'An error is preventing this alert from being visualized.';

describe('<GraphPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows graph preview correctly when data is loaded', async () => {
    const graphProps = {
      isLoading: false,
      isError: false,
      data: { nodes: [], edges: [] },
    };

    const { findByTestId } = renderGraphPreview(mockContextValue, graphProps);

    // Using findByTestId to wait for the component to be rendered because it is a lazy loaded component
    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('shows loading when data is loading', () => {
    const graphProps = {
      isLoading: true,
      isError: false,
    };

    const { getByTestId } = renderGraphPreview(mockContextValue, graphProps);

    expect(getByTestId(GRAPH_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    const graphProps = {
      isLoading: false,
      isError: true,
    };

    const { getByText } = renderGraphPreview(mockContextValue, graphProps);

    expect(getByText(ERROR_MESSAGE)).toBeInTheDocument();
  });
});
