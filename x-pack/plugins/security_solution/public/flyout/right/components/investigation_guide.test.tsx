/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { InvestigationGuide } from './investigation_guide';
import { RightPanelContext } from '../context';
import {
  INVESTIGATION_GUIDE_BUTTON_TEST_ID,
  INVESTIGATION_GUIDE_LOADING_TEST_ID,
  INVESTIGATION_GUIDE_NO_DATA_TEST_ID,
  INVESTIGATION_GUIDE_TEST_ID,
} from './test_ids';
import { mockContextValue } from '../mocks/mock_right_panel_context';
import { mockFlyoutContextValue } from '../../shared/mocks/mock_flyout_context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';
import { LeftPanelInvestigationTab, LeftPanelKey } from '../../left';

jest.mock('../../shared/hooks/use_investigation_guide');

const renderInvestigationGuide = () => (
  <IntlProvider locale="en">
    <ExpandableFlyoutContext.Provider value={mockFlyoutContextValue}>
      <RightPanelContext.Provider value={mockContextValue}>
        <InvestigationGuide />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  </IntlProvider>
);

describe('<InvestigationGuide />', () => {
  it('should render investigation guide button correctly', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: 'test note',
    });
    const { getByTestId, queryByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent('Investigation guide');
    expect(getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).toHaveTextContent(
      'Show investigation guide'
    );
    expect(queryByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: true,
    });
    const { getByTestId, queryByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render no data message when there is no ruleId', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: {},
      ruleNote: 'test note',
    });
    const { getByTestId, queryByTestId } = render(renderInvestigationGuide());
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).toHaveTextContent(
      'There’s no investigation guide for this rule.'
    );
  });

  it('should render no data message when there is no rule note', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: undefined,
    });
    const { getByTestId, queryByTestId } = render(renderInvestigationGuide());
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).toHaveTextContent(
      'There’s no investigation guide for this rule.'
    );
  });

  it('should render no data message when useInvestigationGuide errors out', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { getByTestId } = render(renderInvestigationGuide());
    expect(getByTestId(INVESTIGATION_GUIDE_NO_DATA_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to investigation guide when clicking on button', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: 'test note',
    });

    const { getByTestId } = render(renderInvestigationGuide());
    getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID).click();

    expect(mockFlyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: {
        tab: LeftPanelInvestigationTab,
      },
      params: {
        id: mockContextValue.eventId,
        indexName: mockContextValue.indexName,
        scopeId: mockContextValue.scopeId,
      },
    });
  });
});
