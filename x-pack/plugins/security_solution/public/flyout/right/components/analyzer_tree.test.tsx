/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ANALYZER_TREE_TEST_ID,
  ANALYZER_TREE_LOADING_TEST_ID,
  ANALYZER_TREE_ERROR_TEST_ID,
  ANALYZER_TREE_VIEW_DETAILS_BUTTON_TEST_ID,
} from './test_ids';
import { ANALYZER_PREVIEW_TITLE } from './translations';
import * as mock from '../mocks/mock_analyzer_data';
import type { AnalyzerTreeProps } from './analyzer_tree';
import { AnalyzerTree } from './analyzer_tree';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { RightPanelContext } from '../context';
import { LeftPanelKey, LeftPanelVisualizeTabPath } from '../../left';

const defaultProps: AnalyzerTreeProps = {
  statsNodes: mock.mockStatsNodes,
  loading: false,
  error: false,
};

const flyoutContextValue = {
  openLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutContext;

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
} as unknown as RightPanelContext;

const renderAnalyzerTree = (children: React.ReactNode) =>
  render(
    <TestProviders>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={panelContextValue}>
          {children}
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
    </TestProviders>
  );

describe('<AnalyzerTree />', () => {
  it('should render the component when data is passed', () => {
    const { getByTestId, getByText } = renderAnalyzerTree(<AnalyzerTree {...defaultProps} />);
    expect(getByText(ANALYZER_PREVIEW_TITLE)).toBeInTheDocument();
    expect(getByTestId(ANALYZER_TREE_TEST_ID)).toBeInTheDocument();
  });

  it('should render blank when data is not passed', () => {
    const { queryByTestId, queryByText } = renderAnalyzerTree(
      <AnalyzerTree {...defaultProps} statsNodes={undefined} />
    );
    expect(queryByText(ANALYZER_PREVIEW_TITLE)).not.toBeInTheDocument();
    expect(queryByTestId(ANALYZER_TREE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading spinner when loading is true', () => {
    const { getByTestId } = renderAnalyzerTree(<AnalyzerTree {...defaultProps} loading={true} />);
    expect(getByTestId(ANALYZER_TREE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should display error message when error is true', () => {
    const { getByTestId, getByText } = renderAnalyzerTree(
      <AnalyzerTree {...defaultProps} error={true} />
    );
    expect(getByText('Unable to display analyzer preview.')).toBeInTheDocument();
    expect(getByTestId(ANALYZER_TREE_ERROR_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to left section Visualize tab when clicking on title', () => {
    const { getByTestId } = renderAnalyzerTree(<AnalyzerTree {...defaultProps} />);

    getByTestId(ANALYZER_TREE_VIEW_DETAILS_BUTTON_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: LeftPanelVisualizeTabPath,
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });
});
