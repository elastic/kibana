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
import { LeftPanelInsightsTabPath, LeftPanelKey } from '../../left';
import React from 'react';
import { PrevalenceOverview } from './prevalence_overview';
import { usePrevalence } from '../hooks/use_prevalence';
import { PrevalenceOverviewRow } from './prevalence_overview_row';
import { useFetchFieldValuePairWithAggregation } from '../../shared/hooks/use_fetch_field_value_pair_with_aggregation';
import { useFetchUniqueByField } from '../../shared/hooks/use_fetch_unique_by_field';

jest.mock('../../shared/hooks/use_fetch_field_value_pair_with_aggregation');
jest.mock('../../shared/hooks/use_fetch_unique_by_field');
jest.mock('../hooks/use_prevalence');

const highlightedField = {
  name: 'field',
  values: ['values'],
};
const callbackIfNull = jest.fn();

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
} as unknown as RightPanelContext;

const renderPrevalenceOverview = (contextValue: RightPanelContext) => (
  <TestProviders>
    <RightPanelContext.Provider value={contextValue}>
      <PrevalenceOverview />
    </RightPanelContext.Provider>
  </TestProviders>
);

describe('<PrevalenceOverview />', () => {
  it('should render PrevalenceOverviewRows', () => {
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
    (usePrevalence as jest.Mock).mockReturnValue({
      empty: false,
      prevalenceRows: [
        <PrevalenceOverviewRow
          highlightedField={highlightedField}
          callbackIfNull={callbackIfNull}
          data-test-subj={'test'}
        />,
      ],
    });

    const titleDataTestSubj = `${INSIGHTS_PREVALENCE_TEST_ID}Title`;
    const iconDataTestSubj = 'testIcon';
    const valueDataTestSubj = 'testValue';

    const { getByTestId } = render(renderPrevalenceOverview(panelContextValue));

    expect(getByTestId(titleDataTestSubj)).toBeInTheDocument();
    expect(getByTestId(iconDataTestSubj)).toBeInTheDocument();
    expect(getByTestId(valueDataTestSubj)).toBeInTheDocument();
  });

  it('should render null if no rows are rendered', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      empty: true,
      prevalenceRows: [],
    });

    const { container } = render(renderPrevalenceOverview(panelContextValue));

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
    (usePrevalence as jest.Mock).mockReturnValue({
      empty: false,
      prevalenceRows: [
        <PrevalenceOverviewRow
          highlightedField={highlightedField}
          callbackIfNull={callbackIfNull}
          data-test-subj={'test'}
        />,
      ],
    });
    const flyoutContextValue = {
      openLeftPanel: jest.fn(),
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId } = render(
      <TestProviders>
        <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
          <RightPanelContext.Provider value={panelContextValue}>
            <PrevalenceOverview />
          </RightPanelContext.Provider>
        </ExpandableFlyoutContext.Provider>
      </TestProviders>
    );

    getByTestId(`${INSIGHTS_PREVALENCE_TEST_ID}ViewAllButton`).click();
    expect(flyoutContextValue.openLeftPanel).toHaveBeenCalledWith({
      id: LeftPanelKey,
      path: LeftPanelInsightsTabPath,
      params: {
        id: panelContextValue.eventId,
        indexName: panelContextValue.indexName,
        scopeId: panelContextValue.scopeId,
      },
    });
  });
});
