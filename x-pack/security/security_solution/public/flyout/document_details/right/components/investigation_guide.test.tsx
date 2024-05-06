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
  INVESTIGATION_GUIDE_TEST_ID,
} from './test_ids';
import { mockContextValue } from '../mocks/mock_context';
import type { ExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';
import { LeftPanelInvestigationTab, DocumentDetailsLeftPanelKey } from '../../left';

jest.mock('../../shared/hooks/use_investigation_guide');
jest.mock('@kbn/expandable-flyout', () => ({ useExpandableFlyoutApi: jest.fn() }));

const mockFlyoutContextValue = { openLeftPanel: jest.fn() };

const NO_DATA_MESSAGE = 'Investigation guideThere’s no investigation guide for this rule.';
const PREVIEW_MESSAGE = 'Investigation guide is not available in alert preview.';

const renderInvestigationGuide = () =>
  render(
    <IntlProvider locale="en">
      <RightPanelContext.Provider value={mockContextValue}>
        <InvestigationGuide />
      </RightPanelContext.Provider>
    </IntlProvider>
  );

describe('<InvestigationGuide />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      openLeftPanel: mockFlyoutContextValue.openLeftPanel,
    } as unknown as ExpandableFlyoutApi);
  });

  it('should render investigation guide button correctly', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: 'test note',
    });
    const { getByTestId, queryByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent('Investigation guide');
    expect(getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).toHaveTextContent(
      'Show investigation guide'
    );
    expect(queryByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render loading', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: true,
    });
    const { getByTestId, queryByTestId } = renderInvestigationGuide();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).not.toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render no data message when there is no ruleId', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: {},
      ruleNote: 'test note',
    });
    const { queryByTestId, getByTestId } = renderInvestigationGuide();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render no data message when there is no rule note', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: undefined,
    });
    const { getByTestId, queryByTestId } = renderInvestigationGuide();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render no data message when useInvestigationGuide errors out', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });

    const { queryByTestId, getByTestId } = renderInvestigationGuide();
    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(NO_DATA_MESSAGE);
  });

  it('should render preview message when flyout is in preview', () => {
    const { queryByTestId, getByTestId } = render(
      <IntlProvider locale="en">
        <RightPanelContext.Provider value={{ ...mockContextValue, isPreview: true }}>
          <InvestigationGuide />
        </RightPanelContext.Provider>
      </IntlProvider>
    );

    expect(queryByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INVESTIGATION_GUIDE_TEST_ID)).toHaveTextContent(PREVIEW_MESSAGE);
  });

  it('should navigate to investigation guide when clicking on button', () => {
    (useInvestigationGuide as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      basicAlertData: { ruleId: 'ruleId' },
      ruleNote: 'test note',
    });

    const { getByTestId } = renderInvestigationGuide();
    getByTestId(INVESTIGATION_GUIDE_BUTTON_TEST_ID).click();

    expect(mockFlyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
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
