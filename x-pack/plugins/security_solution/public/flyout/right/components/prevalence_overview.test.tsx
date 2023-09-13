/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { RightPanelContext } from '../context';
import { INSIGHTS_PREVALENCE_TEST_ID } from './test_ids';
import { LeftPanelInsightsTab, LeftPanelKey } from '../../left';
import React from 'react';
import { PrevalenceOverview } from './prevalence_overview';
import { PREVALENCE_TAB_ID } from '../../left/components/prevalence_details';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_LOADING_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../shared/components/test_ids';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { mockContextValue } from '../mocks/mock_right_panel_context';

jest.mock('../../shared/hooks/use_prevalence');

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(INSIGHTS_PREVALENCE_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(INSIGHTS_PREVALENCE_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(INSIGHTS_PREVALENCE_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(INSIGHTS_PREVALENCE_TEST_ID);

const flyoutContextValue = {
  openLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutContext;

const renderPrevalenceOverview = (contextValue: RightPanelContext = mockContextValue) => (
  <TestProviders>
    <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
      <RightPanelContext.Provider value={contextValue}>
        <PrevalenceOverview />
      </RightPanelContext.Provider>
    </ExpandableFlyoutContext.Provider>
  </TestProviders>
);

describe('<PrevalenceOverview />', () => {
  it('should render wrapper component', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByTestId, queryByTestId } = render(renderPrevalenceOverview());
    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Prevalence');
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render loading', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      data: [],
    });

    const { getByTestId } = render(renderPrevalenceOverview());

    expect(
      getByTestId(EXPANDABLE_PANEL_LOADING_TEST_ID(INSIGHTS_PREVALENCE_TEST_ID))
    ).toBeInTheDocument();
  });

  it('should render no-data message', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByTestId } = render(renderPrevalenceOverview());

    expect(getByTestId(`${INSIGHTS_PREVALENCE_TEST_ID}Error`)).toBeInTheDocument();
  });

  it('should render only data with prevalence less than 10%', () => {
    const field1 = 'field1';
    const field2 = 'field2';
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: field1,
          value: 'value1',
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
        {
          field: field2,
          value: 'value2',
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.5,
          userPrevalence: 0.05,
        },
      ],
    });

    const { queryByTestId, getByTestId } = render(renderPrevalenceOverview());

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Prevalence');

    const iconDataTestSubj1 = `${INSIGHTS_PREVALENCE_TEST_ID}${field1}Icon`;
    const valueDataTestSubj1 = `${INSIGHTS_PREVALENCE_TEST_ID}${field1}Value`;
    expect(getByTestId(iconDataTestSubj1)).toBeInTheDocument();
    expect(getByTestId(valueDataTestSubj1)).toBeInTheDocument();
    expect(getByTestId(valueDataTestSubj1)).toHaveTextContent('field1, value1 is uncommon');

    const iconDataTestSubj2 = `${INSIGHTS_PREVALENCE_TEST_ID}${field2}Icon`;
    const valueDataTestSubj2 = `${INSIGHTS_PREVALENCE_TEST_ID}${field2}Value`;
    expect(queryByTestId(iconDataTestSubj2)).not.toBeInTheDocument();
    expect(queryByTestId(valueDataTestSubj2)).not.toBeInTheDocument();
  });

  it('should render null if eventId is null', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });
    const contextValue = {
      ...mockContextValue,
      eventId: null,
    } as unknown as RightPanelContext;

    const { container } = render(renderPrevalenceOverview(contextValue));

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if browserFields is null', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });
    const contextValue = {
      ...mockContextValue,
      browserFields: null,
    };

    const { container } = render(renderPrevalenceOverview(contextValue));

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if dataFormattedForFieldBrowser is null', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });
    const contextValue = {
      ...mockContextValue,
      dataFormattedForFieldBrowser: null,
    };

    const { container } = render(renderPrevalenceOverview(contextValue));

    expect(container).toBeEmptyDOMElement();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          value: 'value1',
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getByTestId } = render(renderPrevalenceOverview());

    getByTestId(TITLE_LINK_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: PREVALENCE_TAB_ID },
      params: {
        id: 'eventId',
        indexName: 'index',
        scopeId: 'scopeId',
      },
    });
  });
});
