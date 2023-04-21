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
} from './test_ids';
import { ANALYZER_PREVIEW_TITLE } from './translations';
import * as mock from '../mocks/mock_analyzer_data';
import { AnalyzerTree } from './analyzer_tree';

const defaultProps = {
  statsNodes: mock.mockStatsNodes,
  loading: false,
  error: false,
};
describe('<AnalyzerTree />', () => {
  it('should render the component when data is passed', () => {
    const { getByTestId, getByText } = render(<AnalyzerTree {...defaultProps} />);
    expect(getByText(ANALYZER_PREVIEW_TITLE)).toBeInTheDocument();
    expect(getByTestId(ANALYZER_TREE_TEST_ID)).toBeInTheDocument();
  });

  it('should render blank when data is not passed', () => {
    const { queryByTestId, queryByText } = render(
      <AnalyzerTree {...defaultProps} statsNodes={undefined} />
    );
    expect(queryByText(ANALYZER_PREVIEW_TITLE)).not.toBeInTheDocument();
    expect(queryByTestId(ANALYZER_TREE_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading spinner when loading is true', () => {
    const { getByTestId } = render(<AnalyzerTree {...defaultProps} loading={true} />);
    expect(getByTestId(ANALYZER_TREE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should display error message when error is true', () => {
    const { getByTestId, getByText } = render(<AnalyzerTree {...defaultProps} error={true} />);
    expect(getByText('Unable to display analyzer preview.')).toBeInTheDocument();
    expect(getByTestId(ANALYZER_TREE_ERROR_TEST_ID)).toBeInTheDocument();
  });
});
