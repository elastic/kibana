/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useDocumentDetailsContext } from '../../shared/context';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { DocumentDetailsLeftPanelKey } from '../../shared/constants/panel_keys';
import { LeftPanelInsightsTab } from '../../left';
import { useFetchThreatIntelligence } from '../hooks/use_fetch_threat_intelligence';
import { THREAT_INTELLIGENCE_TAB_ID } from '../../left/components/threat_intelligence_details';
import {
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_TEST_ID,
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID,
  SUMMARY_ROW_BUTTON_TEST_ID,
  SUMMARY_ROW_TEXT_TEST_ID,
} from './test_ids';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_LOADING_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';

jest.mock('@kbn/expandable-flyout');
jest.mock('../../shared/context');
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
const LOADING_TEST_ID = EXPANDABLE_PANEL_LOADING_TEST_ID(INSIGHTS_THREAT_INTELLIGENCE_TEST_ID);
const THREAT_MATCHES_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID
);
const THREAT_MATCHES_BUTTON_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_THREAT_MATCHES_TEST_ID
);
const ENRICHED_WITH_THREAT_INTELLIGENCE_TEXT_TEST_ID = SUMMARY_ROW_TEXT_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID
);
const ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID = SUMMARY_ROW_BUTTON_TEST_ID(
  INSIGHTS_THREAT_INTELLIGENCE_ENRICHED_WITH_THREAT_INTELLIGENCE_TEST_ID
);

const mockOpenLeftPanel = jest.fn();
const eventId = 'eventId';
const indexName = 'indexName';
const scopeId = 'scopeId';
const dataFormattedForFieldBrowser = ['scopeId'];

const renderThreatIntelligenceOverview = () =>
  render(
    <IntlProvider locale="en">
      <ThreatIntelligenceOverview />
    </IntlProvider>
  );

describe('<ThreatIntelligenceOverview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useDocumentDetailsContext as jest.Mock).mockReturnValue({
      eventId,
      indexName,
      scopeId,
      dataFormattedForFieldBrowser,
      isPreviewMode: false,
    });
    (useExpandableFlyoutApi as jest.Mock).mockReturnValue({ openLeftPanel: mockOpenLeftPanel });
  });

  it('should render wrapper component', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
    });

    const { getByTestId, queryByTestId } = renderThreatIntelligenceOverview();

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should not render link if isPreviewMode is true', () => {
    (useDocumentDetailsContext as jest.Mock).mockReturnValue({
      eventId,
      indexName,
      scopeId,
      dataFormattedForFieldBrowser,
      isPreviewMode: true,
    });
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
    });

    const { getByTestId, queryByTestId } = renderThreatIntelligenceOverview();

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

    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Threat intelligence');
    expect(getByTestId(THREAT_MATCHES_TEXT_TEST_ID)).toHaveTextContent('Threat match detected');
    expect(getByTestId(THREAT_MATCHES_BUTTON_TEST_ID)).toHaveTextContent('1');
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_TEXT_TEST_ID)).toHaveTextContent(
      'Field enriched with threat intelligence'
    );
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID)).toHaveTextContent('1');
  });

  it('should render 2 matches detected and 2 fields enriched', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 2,
      threatEnrichmentsCount: 2,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(TITLE_LINK_TEST_ID)).toHaveTextContent('Threat intelligence');
    expect(getByTestId(THREAT_MATCHES_TEXT_TEST_ID)).toHaveTextContent('Threat matches detected');
    expect(getByTestId(THREAT_MATCHES_BUTTON_TEST_ID)).toHaveTextContent('2');
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_TEXT_TEST_ID)).toHaveTextContent(
      'Fields enriched with threat intelligence'
    );
    expect(getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID)).toHaveTextContent('2');
  });

  it('should render loading', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();

    expect(getByTestId(LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });
    const { getByTestId } = renderThreatIntelligenceOverview();

    getByTestId(TITLE_LINK_TEST_ID).click();
    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: THREAT_INTELLIGENCE_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  });

  it('should open the expanded section to the correct tab when the number is clicked', () => {
    (useFetchThreatIntelligence as jest.Mock).mockReturnValue({
      loading: false,
      threatMatchesCount: 1,
      threatEnrichmentsCount: 1,
    });

    const { getByTestId } = renderThreatIntelligenceOverview();
    getByTestId(THREAT_MATCHES_BUTTON_TEST_ID).click();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: THREAT_INTELLIGENCE_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });

    getByTestId(ENRICHED_WITH_THREAT_INTELLIGENCE_BUTTON_TEST_ID).click();

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: {
        tab: LeftPanelInsightsTab,
        subTab: THREAT_INTELLIGENCE_TAB_ID,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  });
});
