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
import {
  INSIGHTS_PREVALENCE_TITLE_ICON_TEST_ID,
  INSIGHTS_PREVALENCE_TITLE_LINK_TEST_ID,
  INSIGHTS_PREVALENCE_TITLE_TEXT_TEST_ID,
  INSIGHTS_PREVALENCE_TOGGLE_ICON_TEST_ID,
} from './test_ids';
import { LeftPanelInsightsTab, LeftPanelKey } from '../../left';
import React from 'react';
import { PrevalenceOverview } from './prevalence_overview';
import { usePrevalence } from '../hooks/use_prevalence';
import { PrevalenceOverviewRow } from './prevalence_overview_row';
import { useFetchFieldValuePairWithAggregation } from '../../shared/hooks/use_fetch_field_value_pair_with_aggregation';
import { useFetchUniqueByField } from '../../shared/hooks/use_fetch_unique_by_field';
import { PREVALENCE_TAB_ID } from '../../left/components/prevalence_details';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

jest.mock('../../shared/hooks/use_fetch_field_value_pair_with_aggregation');
jest.mock('../../shared/hooks/use_fetch_unique_by_field');
jest.mock('../hooks/use_prevalence');

const highlightedField = {
  name: 'field',
  values: ['values'],
};
const panelContextValue = (
  eventId: string | null,
  browserFields: BrowserFields | null,
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null
) =>
  ({
    eventId,
    indexName: 'indexName',
    browserFields,
    dataFormattedForFieldBrowser,
    scopeId: 'scopeId',
  } as unknown as RightPanelContext);

const renderPrevalenceOverview = (contextValue: RightPanelContext) => (
  <TestProviders>
    <RightPanelContext.Provider value={contextValue}>
      <PrevalenceOverview />
    </RightPanelContext.Provider>
  </TestProviders>
);

describe('<PrevalenceOverview />', () => {
  it('should render wrapper component', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 10,
    });
    (usePrevalence as jest.Mock).mockReturnValue([]);

    const { getByTestId, queryByTestId } = render(
      renderPrevalenceOverview(panelContextValue('eventId', {}, []))
    );
    expect(queryByTestId(INSIGHTS_PREVALENCE_TOGGLE_ICON_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INSIGHTS_PREVALENCE_TITLE_LINK_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INSIGHTS_PREVALENCE_TITLE_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INSIGHTS_PREVALENCE_TITLE_TEXT_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render component', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 10,
    });
    (usePrevalence as jest.Mock).mockReturnValue([
      <PrevalenceOverviewRow highlightedField={highlightedField} data-test-subj={'test'} />,
    ]);

    const { getByTestId } = render(renderPrevalenceOverview(panelContextValue('eventId', {}, [])));

    expect(getByTestId(INSIGHTS_PREVALENCE_TITLE_LINK_TEST_ID)).toHaveTextContent('Prevalence');

    const iconDataTestSubj = 'testIcon';
    const valueDataTestSubj = 'testValue';
    expect(getByTestId(iconDataTestSubj)).toBeInTheDocument();
    expect(getByTestId(valueDataTestSubj)).toBeInTheDocument();
  });

  it('should render null if eventId is null', () => {
    (usePrevalence as jest.Mock).mockReturnValue([]);

    const { container } = render(renderPrevalenceOverview(panelContextValue(null, {}, [])));

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if browserFields is null', () => {
    (usePrevalence as jest.Mock).mockReturnValue([]);

    const { container } = render(renderPrevalenceOverview(panelContextValue('eventId', null, [])));

    expect(container).toBeEmptyDOMElement();
  });

  it('should render null if dataFormattedForFieldBrowser is null', () => {
    (usePrevalence as jest.Mock).mockReturnValue([]);

    const { container } = render(renderPrevalenceOverview(panelContextValue('eventId', {}, null)));

    expect(container).toBeEmptyDOMElement();
  });

  it('should navigate to left section Insights tab when clicking on button', () => {
    (useFetchFieldValuePairWithAggregation as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 1,
    });
    (useFetchUniqueByField as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      count: 10,
    });
    (usePrevalence as jest.Mock).mockReturnValue([
      <PrevalenceOverviewRow highlightedField={highlightedField} data-test-subj={'test'} />,
    ]);
    const flyoutContextValue = {
      openLeftPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue('eventId', {}, [])}>
            <PrevalenceOverview />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );

    getByTestId(INSIGHTS_PREVALENCE_TITLE_LINK_TEST_ID).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: { tab: LeftPanelInsightsTab, subTab: PREVALENCE_TAB_ID },
      params: {
        id: 'eventId',
        indexName: 'indexName',
        scopeId: 'scopeId',
      },
    });
  });
});
