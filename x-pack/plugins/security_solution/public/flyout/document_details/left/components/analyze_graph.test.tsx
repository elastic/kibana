/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TableId } from '@kbn/securitysolution-data-table';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { AnalyzeGraph, ANALYZER_PREVIEW_BANNER } from './analyze_graph';
import { ANALYZER_GRAPH_TEST_ID } from './test_ids';
import { useWhichFlyout } from '../../shared/hooks/use_which_flyout';
import { mockFlyoutApi } from '../../shared/mocks/mock_flyout_context';
import { DocumentDetailsAnalyzerPanelKey } from '../../shared/constants/panel_keys';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../resolver/view/use_resolver_query_params_cleaner');
jest.mock('../../shared/hooks/use_which_flyout');
const mockUseWhichFlyout = useWhichFlyout as jest.Mock;
const FLYOUT_KEY = 'securitySolution';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('<AnalyzeGraph />', () => {
  beforeEach(() => {
    mockUseWhichFlyout.mockReturnValue(FLYOUT_KEY);
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('renders analyzer graph correctly', () => {
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
    } as unknown as DocumentDetailsContext;

    const wrapper = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );
    expect(wrapper.getByTestId(ANALYZER_GRAPH_TEST_ID)).toBeInTheDocument();
  });

  it('clicking view button should open details panel in preview', () => {
    const contextValue = {
      eventId: 'eventId',
      scopeId: TableId.test,
    } as unknown as DocumentDetailsContext;

    const wrapper = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={contextValue}>
          <AnalyzeGraph />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(wrapper.getByTestId('resolver:graph-controls:show-panel-button')).toBeInTheDocument();
    wrapper.getByTestId('resolver:graph-controls:show-panel-button').click();
    expect(mockFlyoutApi.openPreviewPanel).toBeCalledWith({
      id: DocumentDetailsAnalyzerPanelKey,
      params: {
        resolverComponentInstanceID: `${FLYOUT_KEY}-${TableId.test}`,
        banner: ANALYZER_PREVIEW_BANNER,
      },
    });
  });
});
