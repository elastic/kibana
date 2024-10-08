/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { useAlertPrevalenceFromProcessTree } from '../../shared/hooks/use_alert_prevalence_from_process_tree';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { DocumentDetailsContext } from '../../shared/context';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import * as mock from '../mocks/mock_analyzer_data';

jest.mock('../../shared/hooks/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

jest.mock('../../../../timelines/containers/use_timeline_data_filters', () => ({
  useTimelineDataFilters: jest.fn(),
}));
const mockUseTimelineDataFilters = useTimelineDataFilters as jest.Mock;

const mockTreeValues = {
  loading: false,
  error: false,
  alertIds: ['alertid'],
  statsNodes: mock.mockStatsNodes,
};

const renderAnalyzerPreview = (contextValue: DocumentDetailsContext) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <AnalyzerPreview />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = 'An error is preventing this alert from being analyzed.';

describe('<AnalyzerPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTimelineDataFilters.mockReturnValue({ selectedPatterns: ['index'] });
  });

  it('shows analyzer preview correctly when documentId and index are present', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue(mockTreeValues);
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };

    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: 'eventId',
      indices: ['rule-indices'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should use selected index patterns for non-alerts', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue(mockTreeValues);
    const wrapper = renderAnalyzerPreview({
      ...mockContextValue,
      dataFormattedForFieldBrowser: [],
    });

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: 'eventId',
      indices: ['index'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should use ancestor id as document id when in preview', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue(mockTreeValues);
    const contextValue = {
      ...mockContextValue,
      getFieldsData: () => 'ancestors-id',
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
      isPreview: true,
    };

    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: 'ancestors-id',
      indices: ['rule-indices'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: true,
      alertIds: undefined,
      statsNodes: undefined,
    });
    const { getByText } = renderAnalyzerPreview(mockContextValue);
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
