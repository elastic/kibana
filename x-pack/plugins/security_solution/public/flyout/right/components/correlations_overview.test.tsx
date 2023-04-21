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
  INSIGHTS_CORRELATIONS_CONTENT_TEST_ID,
  INSIGHTS_CORRELATIONS_LOADING_TEST_ID,
  INSIGHTS_CORRELATIONS_TITLE_TEST_ID,
  INSIGHTS_CORRELATIONS_VIEW_ALL_BUTTON_TEST_ID,
} from './test_ids';
import { TestProviders } from '../../../common/mock';
import { useShowRelatedCases } from '../hooks/use_show_related_cases';
import { useFetchRelatedCases } from '../hooks/use_fetch_related_cases';
import { useShowRelatedAlertsByAncestry } from '../hooks/use_show_related_alerts_by_ancestry';
import { useFetchRelatedAlertsByAncestry } from '../hooks/use_fetch_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from '../hooks/use_show_related_alerts_by_same_source_event';
import { useFetchRelatedAlertsBySameSourceEvent } from '../hooks/use_fetch_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../hooks/use_show_related_alerts_by_session';
import { useFetchRelatedAlertsBySession } from '../hooks/use_fetch_related_alerts_by_session';
import { CorrelationsOverview } from './correlations_overview';
import { LeftPanelInsightsTabPath, LeftPanelKey } from '../../left';

jest.mock('../hooks/use_show_related_cases');
jest.mock('../hooks/use_fetch_related_cases');
jest.mock('../hooks/use_show_related_alerts_by_ancestry');
jest.mock('../hooks/use_fetch_related_alerts_by_ancestry');
jest.mock('../hooks/use_show_related_alerts_by_same_source_event');
jest.mock('../hooks/use_fetch_related_alerts_by_same_source_event');
jest.mock('../hooks/use_show_related_alerts_by_session');
jest.mock('../hooks/use_fetch_related_alerts_by_session');

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

const mockShowHooks = ({
  cases = true,
  ancestry = true,
  sameSource = true,
  session = true,
}: {
  cases?: boolean;
  ancestry?: boolean;
  sameSource?: boolean;
  session?: boolean;
}) => {
  (useShowRelatedCases as jest.Mock).mockReturnValue(cases);
  (useShowRelatedAlertsByAncestry as jest.Mock).mockReturnValue(ancestry);
  (useShowRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue(sameSource);
  (useShowRelatedAlertsBySession as jest.Mock).mockReturnValue(session);
};

const mockFetchReturnValue = {
  loading: false,
  error: false,
  dataCount: 1,
};

const mockFetchReturnValueError = { ...mockFetchReturnValue, error: true };

const mockFetchHooks = ({
  cases = mockFetchReturnValue,
  ancestry = mockFetchReturnValue,
  sameSource = mockFetchReturnValue,
  session = mockFetchReturnValue,
}: {
  cases?: typeof mockFetchReturnValue;
  ancestry?: typeof mockFetchReturnValue;
  sameSource?: typeof mockFetchReturnValue;
  session?: typeof mockFetchReturnValue;
}) => {
  (useFetchRelatedCases as jest.Mock).mockReturnValue(cases);
  (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue(ancestry);
  (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue(sameSource);
  (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue(session);
};

describe('<ThreatIntelligenceOverview />', () => {
  it('should show component with all rows in summary panel', () => {
    mockShowHooks({});
    mockFetchHooks({});

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_TITLE_TEST_ID)).toHaveTextContent('Correlations');
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent('1 related case');
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent(
      '1 alert related by ancestry'
    );
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent(
      '1 alert related by the same source event'
    );
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).toHaveTextContent(
      '1 alert related by session'
    );
    expect(getByTestId(INSIGHTS_CORRELATIONS_VIEW_ALL_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should hide related cases row', () => {
    mockShowHooks({ cases: false });
    mockFetchHooks({});

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'related case'
    );
  });

  it('should hide related cases row if error', () => {
    mockShowHooks({});
    mockFetchHooks({ cases: mockFetchReturnValueError });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'related case'
    );
  });

  it('should hide related alerts by ancestry row', () => {
    mockShowHooks({ ancestry: false });
    mockFetchHooks({});

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'alert related by ancestry'
    );
  });

  it('should hide related alerts by ancestry row if error', () => {
    mockShowHooks({});
    mockFetchHooks({ ancestry: mockFetchReturnValueError });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'alert related by ancestry'
    );
  });

  it('should hide same source event row', () => {
    mockShowHooks({ sameSource: false });
    mockFetchHooks({});

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'alert related by the same source event'
    );
  });

  it('should hide same source event row if error ', () => {
    mockShowHooks({});
    mockFetchHooks({ sameSource: mockFetchReturnValueError });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'alert related by the same source event'
    );
  });

  it('should hide related by session row', () => {
    mockShowHooks({ session: false });
    mockFetchHooks({});

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'alert related by session'
    );
  });

  it('should hide related by session row if error', () => {
    mockShowHooks({});
    mockFetchHooks({ session: mockFetchReturnValueError });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_CONTENT_TEST_ID)).not.toHaveTextContent(
      'alert related by session'
    );
  });

  it('should render null if all rows are hidden', () => {
    mockShowHooks({ cases: false, ancestry: false, sameSource: false, session: false });
    mockFetchHooks({});

    const { container } = render(renderCorrelationsOverview(panelContextValue));
    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if all rows have error', () => {
    mockShowHooks({});
    mockFetchHooks({
      cases: mockFetchReturnValueError,
      ancestry: mockFetchReturnValueError,
      sameSource: mockFetchReturnValueError,
      session: mockFetchReturnValueError,
    });

    const { container } = render(renderCorrelationsOverview(panelContextValue));
    expect(container).toBeEmptyDOMElement();
  });

  it('should render loading if any rows are loading', () => {
    mockShowHooks({});
    mockFetchHooks({
      cases: {
        loading: true,
        error: false,
        dataCount: 0,
      },
    });

    const { getByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(INSIGHTS_CORRELATIONS_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should navigate to the left section Insights tab when clicking on button', () => {
    mockShowHooks({});
    mockFetchHooks({});

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

    getByTestId(INSIGHTS_CORRELATIONS_VIEW_ALL_BUTTON_TEST_ID).click();
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
