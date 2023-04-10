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
import { useInvestigationTimeEnrichment } from '../../../common/containers/cti/event_enrichment';

jest.mock('../../../common/containers/cti/event_enrichment');

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  dataFormattedForFieldBrowser: [
    {
      category: 'kibana',
      field: 'kibana.alert.rule.uuid',
      isObjectArray: false,
      originalValue: ['uuid'],
      values: ['uuid'],
    },
    {
      category: 'threat',
      field: 'threat.enrichments',
      isObjectArray: true,
      originalValue: ['{"indicator.file.hash.sha256":["sha256"]}'],
      values: ['{"indicator.file.hash.sha256":["sha256"]}'],
    },
    {
      category: 'threat',
      field: 'threat.enrichments.indicator.file.hash.sha256',
      isObjectArray: false,
      originalValue: ['sha256'],
      values: ['sha256'],
    },
  ],
} as unknown as RightPanelContext;

describe('<ThreatIntelligenceOverview />', () => {
  it('should render 1 match detected and 1 field enriched', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.1'],
            'matched.type': ['indicator_match_rule'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.2'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
        ],
        totalCount: 2,
      },
      loading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );
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
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.1'],
            'matched.type': ['indicator_match_rule'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.2'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.3'],
            'matched.type': ['indicator_match_rule'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.4'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
        ],
        totalCount: 4,
      },
      loading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );
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
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.1'],
            'matched.type': ['indicator_match_rule'],
          },
        ],
        totalCount: 1,
      },
      loading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '0 field enriched with threat intelligence'
    );
  });

  it('should render 0 match detected', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.2'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
        ],
        totalCount: 1,
      },
      loading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_CONTENT_TEST_ID)).toHaveTextContent(
      '0 threat match detected'
    );
  });

  it('should render loading', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: undefined,
      loading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <RightPanelContext.Provider value={panelContextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );
    expect(getByTestId(INSIGHTS_THREAT_INTELLIGENCE_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should only render null when eventId is null', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [],
      },
      loading: false,
    });
    const contextValue = {
      ...panelContextValue,
      eventId: null,
    } as unknown as RightPanelContext;

    const { container } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should only render null when dataFormattedForFieldBrowser is null', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [],
      },
      loading: false,
    });
    const contextValue = {
      ...panelContextValue,
      dataFormattedForFieldBrowser: null,
    } as unknown as RightPanelContext;

    const { container } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should only render null when no enrichment found is null', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [],
        totalCount: 0,
      },
      loading: false,
    });
    const contextValue = {
      ...panelContextValue,
      dataFormattedForFieldBrowser: [],
    } as unknown as RightPanelContext;

    const { container } = render(
      <TestProviders>
        <RightPanelContext.Provider value={contextValue}>
          <ThreatIntelligenceOverview />
        </RightPanelContext.Provider>
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.1'],
            'matched.type': ['indicator_match_rule'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.2'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
        ],
        totalCount: 2,
      },
      loading: false,
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
