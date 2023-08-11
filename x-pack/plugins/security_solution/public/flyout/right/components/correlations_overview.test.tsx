/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { RightPanelContext } from '../context';
import { TestProviders } from '../../../common/mock';
import { CorrelationsOverview } from './correlations_overview';
import { useCorrelations } from '../../shared/hooks/use_correlations';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { LeftPanelInsightsTab, LeftPanelKey } from '../../left';
import {
  INSIGHTS_CORRELATIONS_CONTENT_TEST_ID,
  INSIGHTS_CORRELATIONS_LOADING_TEST_ID,
  INSIGHTS_CORRELATIONS_TITLE_ICON_TEST_ID,
  INSIGHTS_CORRELATIONS_TITLE_LINK_TEST_ID,
  INSIGHTS_CORRELATIONS_TITLE_TEXT_TEST_ID,
  INSIGHTS_CORRELATIONS_TOGGLE_ICON_TEST_ID,
} from './test_ids';

jest.mock('../../shared/hooks/use_correlations');

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
  scopeId: 'scopeId',
} as unknown as RightPanelContext;

const renderCorrelationsOverview = (contextValue: RightPanelContext) => (
  <TestProviders>
    <RightPanelContext.Provider value={contextValue}>
      <CorrelationsOverview />
    </RightPanelContext.Provider>
  </TestProviders>
);

describe('<CorrelationsOverview />', () => {
  it('should render wrapper component', () => {
    (useCorrelations as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByTestId, queryByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(queryByTestId(INSIGHTS_CORRELATIONS_TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INSIGHTS_CORRELATIONS_TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INSIGHTS_CORRELATIONS_TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INSIGHTS_CORRELATIONS_TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should show component with all rows in expandable panel', () => {
    (useCorrelations as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        { icon: 'warning', value: 1, text: 'related case' },
        { icon: 'warning', value: 2, text: 'alerts related by ancestry' },
        { icon: 'warning', value: 3, text: 'alerts related by the same source event' },
        { icon: 'warning', value: 4, text: 'alerts related by session' },
      ],
      dataCount: 4,
    });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_TITLE_LINK_TEST_ID)).toHaveTextContent('Correlations');
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent('1 related case');
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent(
      '2 alerts related by ancestry'
    );
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent(
      '3 alerts related by the same source event'
    );
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent(
      '4 alerts related by session'
    );
  });

  it('should hide row if data is missing', () => {
    (useCorrelations as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        { icon: 'warning', value: 1, text: 'alert related by ancestry' },
        { icon: 'warning', value: 1, text: 'alert related by the same source event' },
        { icon: 'warning', value: 1, text: 'alert related by session' },
      ],
      dataCount: 4,
    });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'related case'
    );
  });

  it('should render null if all rows are hidden', () => {
    (useCorrelations as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      data: [],
      dataCount: 0,
    });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toBeEmptyDOMElement();
  });

  it('should render loading if any rows are loading', () => {
    (useCorrelations as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      data: [],
      dataCount: 0,
    });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to the left section Insights tab when clicking on button', () => {
    (useCorrelations as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        { icon: 'warning', value: 1, text: 'related case' },
        { icon: 'warning', value: 6, text: 'alerts related by ancestry' },
        { icon: 'warning', value: 1, text: 'alert related by the same source event' },
        { icon: 'warning', value: 6, text: 'alerts related by session' },
      ],
      dataCount: 4,
    });

    const flyoutContextValue = {
      openLeftPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue}>
            <CorrelationsOverview />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );

    getByTestId(INSIGHTS_CORRELATIONS_TITLE_LINK_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: CORRELATIONS_TAB_ID },
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });
});
