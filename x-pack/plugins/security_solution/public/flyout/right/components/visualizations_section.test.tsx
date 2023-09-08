/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { VISUALIZATIONS_SECTION_HEADER_TEST_ID } from './test_ids';
import { TestProviders } from '../../../common/mock';
import { VisualizationsSection } from './visualizations_section';
import { mockContextValue } from '../mocks/mock_right_panel_context';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_context';
import { RightPanelContext } from '../context';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';

jest.mock('../../../common/containers/alerts/use_alert_prevalence_from_process_tree', () => ({
  useAlertPrevalenceFromProcessTree: jest.fn(),
}));
const mockUseAlertPrevalenceFromProcessTree = useAlertPrevalenceFromProcessTree as jest.Mock;

const contextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

describe('<VisualizationsSection />', () => {
  beforeEach(() => {
    mockUseAlertPrevalenceFromProcessTree.mockReturnValue({
      loading: false,
      error: false,
      alertIds: undefined,
      statsNodes: undefined,
    });
  });

  it('should render visualizations component', () => {
    const flyoutContextValue = {
      openLeftPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId, getAllByRole } = render(
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <RightPanelContext.Provider value={contextValue}>
          <VisualizationsSection />
        </RightPanelContext.Provider>
      </ExpandableFlyoutContext.Provider>
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
