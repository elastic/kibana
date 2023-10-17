/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { useAlertPrevalenceFromProcessTree } from '../../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { mockContextValue } from '../mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { RightPanelContext } from '../context';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import * as mock from '../mocks/mock_analyzer_data';

jest.mock('../../../../common/containers/alerts/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

const renderAnalyzerPreview = (contextValue: RightPanelContext) =>
  render(
    <TestProviders>
      <RightPanelContext.Provider value={contextValue}>
        <AnalyzerPreview />
      </RightPanelContext.Provider>
    </TestProviders>
  );

const NO_DATA_MESSAGE = 'An error is preventing this alert from being analyzed.';

describe('<AnalyzerPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows analyzer preview correctly when documentId and index are present', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: ['alertid'],
      statsNodes: mock.mockStatsNodes,
    });
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
    };

    const wrapper = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: 'ancestors-id',
      indices: ['rule-indices'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('shows error message when documentid and index are not present', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: undefined,
      statsNodes: undefined,
    });
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: [
        {
          category: 'kibana',
          field: 'kibana.alert.rule.uuid',
          values: ['rule-uuid'],
          originalValue: ['rule-uuid'],
          isObjectArray: false,
        },
      ],
    };
    const { getByText } = renderAnalyzerPreview(contextValue);

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      isActiveTimeline: false,
      documentId: '',
      indices: [],
    });

    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
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
