/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { RightPanelContext } from '../context';
import { TestProviders } from '../../../../common/mock';
import { CorrelationsOverview } from './correlations_overview';
import { CORRELATIONS_TAB_ID } from '../../left/components/correlations_details';
import { LeftPanelInsightsTab, DocumentDetailsLeftPanelKey } from '../../left';
import {
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID,
  CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID,
  CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID,
  CORRELATIONS_RELATED_CASES_TEST_ID,
  CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID,
  CORRELATIONS_TEST_ID,
  SUMMARY_ROW_VALUE_TEST_ID,
} from './test_ids';
import { useShowRelatedAlertsByAncestry } from '../../shared/hooks/use_show_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from '../../shared/hooks/use_show_related_alerts_by_session';
import { useShowRelatedCases } from '../../shared/hooks/use_show_related_cases';
import { useShowSuppressedAlerts } from '../../shared/hooks/use_show_suppressed_alerts';
import { useFetchRelatedAlertsByAncestry } from '../../shared/hooks/use_fetch_related_alerts_by_ancestry';
import { useFetchRelatedAlertsBySameSourceEvent } from '../../shared/hooks/use_fetch_related_alerts_by_same_source_event';
import { useFetchRelatedAlertsBySession } from '../../shared/hooks/use_fetch_related_alerts_by_session';
import { useFetchRelatedCases } from '../../shared/hooks/use_fetch_related_cases';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../../shared/components/test_ids';

jest.mock('../../shared/hooks/use_show_related_alerts_by_ancestry');
jest.mock('../../shared/hooks/use_show_related_alerts_by_same_source_event');
jest.mock('../../shared/hooks/use_show_related_alerts_by_session');
jest.mock('../../shared/hooks/use_show_related_cases');
jest.mock('../../shared/hooks/use_show_suppressed_alerts');
jest.mock('../../shared/hooks/use_fetch_related_alerts_by_session');
jest.mock('../../shared/hooks/use_fetch_related_alerts_by_ancestry');
jest.mock('../../shared/hooks/use_fetch_related_alerts_by_same_source_event');
jest.mock('../../shared/hooks/use_fetch_related_cases');

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(CORRELATIONS_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(CORRELATIONS_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(CORRELATIONS_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(CORRELATIONS_TEST_ID);

const SUPPRESSED_ALERTS_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(CORRELATIONS_SUPPRESSED_ALERTS_TEST_ID);
const RELATED_ALERTS_BY_ANCESTRY_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_ANCESTRY_TEST_ID
);
const RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID
);
const RELATED_ALERTS_BY_SESSION_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(
  CORRELATIONS_RELATED_ALERTS_BY_SESSION_TEST_ID
);
const RELATED_CASES_TEST_ID = SUMMARY_ROW_VALUE_TEST_ID(CORRELATIONS_RELATED_CASES_TEST_ID);

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  getFieldsData: () => {},
  scopeId: 'scopeId',
} as unknown as RightPanelContext;

const renderCorrelationsOverview = (contextValue: RightPanelContext) => (
  <TestProviders>
    <RightPanelContext.Provider value={contextValue}>
      <CorrelationsOverview />
    </RightPanelContext.Provider>
  </TestProviders>
);

const NO_DATA_MESSAGE = 'No correlations data available.';

describe('<CorrelationsOverview />', () => {
  it('should render wrapper component', () => {
    jest.mocked(useShowRelatedAlertsByAncestry).mockReturnValue({ show: false });
    jest.mocked(useShowRelatedAlertsBySameSourceEvent).mockReturnValue({ show: false });
    jest.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: false });
    jest.mocked(useShowRelatedCases).mockReturnValue(false);
    jest.mocked(useShowSuppressedAlerts).mockReturnValue({ show: false, alertSuppressionCount: 0 });

    const { getByTestId, queryByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should show component with all rows in expandable panel', () => {
    jest
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: true, documentId: 'documentId', indices: ['index1'] });
    jest
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: true, originalEventId: 'originalEventId' });
    jest
      .mocked(useShowRelatedAlertsBySession)
      .mockReturnValue({ show: true, entityId: 'entityId' });
    jest.mocked(useShowRelatedCases).mockReturnValue(true);
    jest.mocked(useShowSuppressedAlerts).mockReturnValue({ show: true, alertSuppressionCount: 1 });

    (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });
    (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });
    (useFetchRelatedCases as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      dataCount: 1,
    });

    const { getByTestId, queryByText } = render(renderCorrelationsOverview(panelContextValue));
    expect(getByTestId(RELATED_ALERTS_BY_ANCESTRY_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_ALERTS_BY_SESSION_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RELATED_CASES_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(SUPPRESSED_ALERTS_TEST_ID)).toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should hide rows and show error message if show values are false', () => {
    jest
      .mocked(useShowRelatedAlertsByAncestry)
      .mockReturnValue({ show: false, documentId: 'documentId', indices: ['index1'] });
    jest
      .mocked(useShowRelatedAlertsBySameSourceEvent)
      .mockReturnValue({ show: false, originalEventId: 'originalEventId' });
    jest
      .mocked(useShowRelatedAlertsBySession)
      .mockReturnValue({ show: false, entityId: 'entityId' });
    jest.mocked(useShowRelatedCases).mockReturnValue(false);
    jest.mocked(useShowSuppressedAlerts).mockReturnValue({ show: false, alertSuppressionCount: 0 });

    const { getByText, queryByTestId } = render(renderCorrelationsOverview(panelContextValue));
    expect(queryByTestId(RELATED_ALERTS_BY_ANCESTRY_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_SESSION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_CASES_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(SUPPRESSED_ALERTS_TEST_ID)).not.toBeInTheDocument();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('should hide rows if values are null', () => {
    jest.mocked(useShowRelatedAlertsByAncestry).mockReturnValue({ show: true });
    jest.mocked(useShowRelatedAlertsBySameSourceEvent).mockReturnValue({ show: true });
    jest.mocked(useShowRelatedAlertsBySession).mockReturnValue({ show: true });
    jest.mocked(useShowRelatedCases).mockReturnValue(false);
    jest.mocked(useShowSuppressedAlerts).mockReturnValue({ show: false, alertSuppressionCount: 0 });

    const { queryByTestId, queryByText } = render(renderCorrelationsOverview(panelContextValue));
    expect(queryByTestId(RELATED_ALERTS_BY_ANCESTRY_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_SAME_SOURCE_EVENT_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_ALERTS_BY_SESSION_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(RELATED_CASES_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(SUPPRESSED_ALERTS_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should navigate to the left section Insights tab when clicking on button', () => {
    const flyoutContextValue = {
      openLeftPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContextValue;

    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue}>
            <CorrelationsOverview />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );

    getByTestId(TITLE_LINK_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: DocumentDetailsLeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: CORRELATIONS_TAB_ID },
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });
});
