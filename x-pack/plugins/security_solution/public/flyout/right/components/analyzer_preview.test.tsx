/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { AnalyzerPreview } from './analyzer_preview';
import { ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import * as mock from '../mocks/mock_analyzer_data';

jest.mock('../../../common/containers/alerts/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

const defaultProps = {
  entityId: {
    field: 'testfield',
    values: ['test entityId'],
    isObjectArray: false,
  },
  documentId: {
    field: '_id',
    values: ['original'],
    isObjectArray: false,
  },
  index: {
    field: 'index',
    values: ['test index'],
    isObjectArray: false,
  },
  'data-test-subj': ANALYZER_PREVIEW_TEST_ID,
};

describe('<AnalyzerPreview />', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows analyzer preview correctly', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: ['alertid'],
      statsNodes: mock.mockStatsNodes,
    });
    const wrapper = render(
      <TestProviders>
        <AnalyzerPreview {...defaultProps} />
      </TestProviders>
    );

    expect(mockUseAlertPrevalenceFromProcessTree).toHaveBeenCalledWith({
      processEntityId: 'test entityId',
      isActiveTimeline: false,
      documentId: 'original',
      indices: ['test index'],
    });
    expect(wrapper.getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });
});
