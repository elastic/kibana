/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { VISUALIZATIONS_SECTION_HEADER_TEST_ID } from './test_ids';
import { TestProviders } from '../../../../common/mock';
import { VisualizationsSection } from './visualizations_section';
import { mockContextValue } from '../mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../shared/mocks/mock_data_formatted_for_field_browser';
import { RightPanelContext } from '../context';
import { useAlertPrevalenceFromProcessTree } from '../../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';

jest.mock('../../../../common/containers/alerts/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

jest.mock('../../../../timelines/containers/use_timeline_data_filters', () => ({
  useTimelineDataFilters: jest.fn(),
}));
const mockUseTimelineDataFilters = useTimelineDataFilters as jest.Mock;

const contextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

describe('<VisualizationsSection />', () => {
  beforeEach(() => {
    mockUseTimelineDataFilters.mockReturnValue({ selectedPatterns: ['index'] });
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: undefined,
      statsNodes: undefined,
    });
  });

  it('should render visualizations component', () => {
    const { getByTestId, getAllByRole } = render(
      <IntlProvider locale="en">
        <TestProvider>
          <RightPanelContext.Provider value={contextValue}>
            <VisualizationsSection />
          </RightPanelContext.Provider>
        </TestProvider>
      </IntlProvider>
    );

    expect(getByTestId(VISUALIZATIONS_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
    expect(getAllByRole('button')[0]).not.toHaveAttribute('disabled');
  });

  it('should render visualization component as expanded when expanded is true', () => {
    const { getByTestId, getAllByRole } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <VisualizationsSection expanded={true} />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(VISUALIZATIONS_SECTION_HEADER_TEST_ID)).toBeInTheDocument();
    expect(getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');
    expect(getAllByRole('button')[0]).not.toHaveAttribute('disabled');
  });
});
