/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi, type ExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsContext } from '../../shared/context';
import { TestProviders } from '../../../../common/mock';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { THREAT_INTELLIGENCE_TAB_ID } from '../../left/components/threat_intelligence_details';
import { INSIGHTS_THREAT_INTELLIGENCE_TEST_ID } from './test_ids';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_LOADING_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';

jest.mock('../hooks/use_fetch_threat_intelligence');

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID
);
const CONTENT_TEST_ID = EXPANDABLE_PANEL_CONTENT_TEST_ID(INSIGHTS_THREAT_INTELLIGENCE_TEST_ID);
const LOADING_TEST_ID = EXPANDABLE_PANEL_LOADING_TEST_ID(INSIGHTS_THREAT_INTELLIGENCE_TEST_ID);

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  dataFormattedForFieldBrowser: [],
} as unknown as DocumentDetailsContext;

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

const renderThreatIntelligenceOverview = (contextValue: DocumentDetailsContext) => (
  <TestProviders>
    <DocumentDetailsContext.Provider value={contextValue}>
      <ThreatIntelligenceOverview />
    </DocumentDetailsContext.Provider>
  </TestProviders>
);

const flyoutContextValue = {
  openLeftPanel: jest.fn(),
} as unknown as ExpandableFlyoutApi;

describe('<ThreatIntelligenceOverview />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(flyoutContextValue);
  });

  it('should render wrapper component', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
    });

    const { getByTestId, queryByTestId } = render(
      renderThreatIntelligenceOverview(panelContextValue)
    );

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render link if isPrenviewMode is true', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
    });

    const { getByTestId, queryByTestId } = render(
      renderThreatIntelligenceOverview({ ...panelContextValue, isPreviewMode: true })
    );

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(TITLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_TEXT_TEST_ID)).toBeInTheDocument();
  });

  it('should render 1 match detected and 1 field enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Threat intelligence');
    expect(getByTestId(CONTENT_TEST_ID)).toHaveTextContent('1 threat match detected');
    expect(getByTestId(CONTENT_TEST_ID)).toHaveTextContent(
      '1 field enriched with threat intelligence'
    );
  });

  it('should render 2 matches detected and 2 fields enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 2,
      threatEnrichmentsCount: 2,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Threat intelligence');
    expect(getByTestId(CONTENT_TEST_ID)).toHaveTextContent('2 threat matches detected');
    expect(getByTestId(CONTENT_TEST_ID)).toHaveTextContent(
      '2 fields enriched with threat intelligence'
    );
  });

  it('should render 0 fields enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 0,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(CONTENT_TEST_ID)).toHaveTextContent(
      '0 fields enriched with threat intelligence'
    );
  });

  it('should render 0 matches detected', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 0,
      threatEnrichmentsCount: 2,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(CONTENT_TEST_ID)).toHaveTextContent('0 threat matches detected');
  });

  it('should render loading', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = render(renderThreatIntelligenceOverview(panelContextValue));

    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });
    const { getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <ThreatIntelligenceOverview />
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    getByTestId(TITLE_LINK_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: THREAT_INTELLIGENCE_TAB_ID },
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
      },
    });
  });
});
