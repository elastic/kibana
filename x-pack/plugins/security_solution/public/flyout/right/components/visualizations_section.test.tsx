/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { VISUALIZATIONS_SECTION_HEADER_TEST_ID, ANALYZER_PREVIEW_TEST_ID } from './test_ids';
import { TestProviders } from '../../../common/mock';
import { VisualizationsSection } from './visualizations_section';
import { RightPanelContext } from '../context';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_context';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import * as mock from '../mocks/mock_analyzer_data';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../common/containers/alerts/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

const contextValue = {
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
} as RightPanelContext;

const contextValueEmpty = {
  dataFormattedForFieldBrowser: [
    {
      category: 'kibana',
      field: 'kibana.alert.rule.uuid',
      values: ['rule-uuid'],
      originalValue: ['rule-uuid'],
      isObjectArray: false,
    },
  ],
} as RightPanelContext;

describe('<VisualizationsSection />', () => {
  it('should render visualizations component', () => {
    const { getByTestId, getAllByRole } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValueEmpty}>
          <VisualizationsSection />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(VISUALIZATIONS_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(getAllByRole('button')[0]).not.toHaveAttribute('disabled');
  });

  it('should render visualization component as expanded when expanded is true', () => {
    const { getByTestId, getAllByRole } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValueEmpty}>
          <VisualizationsSection expanded={true} />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(VISUALIZATIONS_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');
    expect(getAllByRole('button')[0]).not.toHaveAttribute('disabled');
  });

  it('should display analyzer preview when required fields are present', () => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: undefined,
      statsNodes: mock.mockStatsNodes,
    });
    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <VisualizationsSection />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(ANALYZER_PREVIEW_TEST_ID)).toBeInTheDocument();
  });

  it('should not display analyzer preview when required fields are not present', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValueEmpty}>
          <VisualizationsSection />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    expect(queryByTestId(ANALYZER_PREVIEW_TEST_ID)).not.toBeInTheDocument();
  });
});
