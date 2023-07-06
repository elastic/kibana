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
import {
  INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_LOADING_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TITLE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON_TEST_ID,
} from './test_ids';
import { TestProviders } from '../../../common/mock';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { LeftPanelInsightsTabPath, LeftPanelKey } from '../../left';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';

jest.mock('../hooks/use_fetch_threat_intelligence');

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  dataFormattedForFieldBrowser: [],
} as unknown as RightPanelContext;

const renderThreatIntelligenceOverview = (contextValue: RightPanelContext) => (
  <TestProviders>
    <RightPanelContext.Provider value={contextValue}>
      <ThreatIntelligenceOverview />
    </RightPanelContext.Provider>
  </TestProviders>
);

describe('<ThreatIntelligenceOverview />', () => {
  it('should render 1 match detected and 1 field enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_TITLE_TEST_ID)).toHaveTextContent(
      'Threat Intelligence'
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '1 threat match detected'
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '1 field enriched with threat intelligence'
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render 2 matches detected and 2 fields enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 2,
      threatEnrichmentsCount: 2,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_TITLE_TEST_ID)).toHaveTextContent(
      'Threat Intelligence'
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '2 threat matches detected'
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '2 fields enriched with threat intelligence'
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render 0 field enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 0,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '0 field enriched with threat intelligence'
    );
  });

  it('should render 0 match detected', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 0,
      threatEnrichmentsCount: 2,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '0 threat match detected'
    );
  });

  it('should render loading', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getAllByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getAllByTestId(INSIGHTS_THREAT_INTELLIGENCE_LOADING_TEST_ID)).toHaveLength(2);
  });

  it('should render null when eventId is null', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
    });
    const contextValue = {
      ...panelContextValue,
      eventId: null,
    } as unknown as RightPanelContext;

    const { container } = render(renderThreatIntelligenceOverview(contextValue));

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null when dataFormattedForFieldBrowser is null', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
    });
    const contextValue = {
      ...panelContextValue,
      dataFormattedForFieldBrowser: null,
    } as unknown as RightPanelContext;

    const { container } = render(renderThreatIntelligenceOverview(contextValue));

    expect(container).toBeEmptyDOMElement();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });
    const flyoutContextValue = {
      openLeftPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue}>
            <ThreatIntelligenceOverview />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );

    getByTestId(INSIGHTS_THREAT_INTELLIGENCE_VIEW_ALL_BUTTON_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: LeftPanelInsightsTabPath,
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
      },
    });
  });
});
