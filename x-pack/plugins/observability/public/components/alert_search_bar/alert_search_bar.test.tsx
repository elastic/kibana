/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { timefilterServiceMock } from '@kbn/data-plugin/public/query/timefilter/timefilter_service.mock';
import { ObservabilityAlertSearchBarProps } from './types';
import { ObservabilityAlertSearchBar } from './alert_search_bar';
import { observabilityAlertFeatureIds } from '../../config/alert_feature_ids';
import { render } from '../../utils/test_helper';

const getAlertsSearchBarMock = jest.fn();
const ALERT_SEARCH_BAR_DATA_TEST_SUBJ = 'alerts-search-bar';

describe('ObservabilityAlertSearchBar', () => {
  const renderComponent = (props: Partial<ObservabilityAlertSearchBarProps> = {}) => {
    const observabilityAlertSearchBarProps: ObservabilityAlertSearchBarProps = {
      appName: 'testAppName',
      kuery: '',
      onRangeFromChange: jest.fn(),
      onRangeToChange: jest.fn(),
      onKueryChange: jest.fn(),
      onStatusChange: jest.fn(),
      onEsQueryChange: jest.fn(),
      rangeTo: 'now',
      rangeFrom: 'now-15m',
      status: 'all',
      services: {
        timeFilterService: timefilterServiceMock.createStartContract().timefilter,
        AlertsSearchBar: getAlertsSearchBarMock.mockReturnValue(
          <div data-test-subj={ALERT_SEARCH_BAR_DATA_TEST_SUBJ} />
        ),
        useToasts: jest.fn(),
      },
      ...props,
    };
    return render(<ObservabilityAlertSearchBar {...observabilityAlertSearchBarProps} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert search bar', async () => {
    const observabilitySearchBar = renderComponent();

    await waitFor(() =>
      expect(observabilitySearchBar.queryByTestId(ALERT_SEARCH_BAR_DATA_TEST_SUBJ)).toBeTruthy()
    );
  });

  it('should call alert search bar with correct props', () => {
    renderComponent();

    expect(getAlertsSearchBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'testAppName',
        featureIds: observabilityAlertFeatureIds,
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        query: '',
      }),
      {}
    );
  });

  it('should filter active alerts', async () => {
    const mockedOnEsQueryChange = jest.fn();
    const mockedFrom = '2022-11-15T09:38:13.604Z';
    const mockedTo = '2022-11-15T09:53:13.604Z';

    renderComponent({
      onEsQueryChange: mockedOnEsQueryChange,
      rangeFrom: mockedFrom,
      rangeTo: mockedTo,
      status: 'active',
    });

    expect(mockedOnEsQueryChange).toHaveBeenCalledWith({
      bool: {
        filter: [
          {
            bool: {
              minimum_should_match: 1,
              should: [{ match_phrase: { 'kibana.alert.status': 'active' } }],
            },
          },
          {
            range: {
              'kibana.alert.time_range': expect.objectContaining({
                format: 'strict_date_optional_time',
                gte: mockedFrom,
                lte: mockedTo,
              }),
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    });
  });

  it('should include defaultSearchQueries in es query', async () => {
    const mockedOnEsQueryChange = jest.fn();
    const mockedFrom = '2022-11-15T09:38:13.604Z';
    const mockedTo = '2022-11-15T09:53:13.604Z';
    const defaultSearchQueries = [
      {
        query: 'kibana.alert.rule.uuid: 413a9631-1a29-4344-a8b4-9a1dc23421ee',
        language: 'kuery',
      },
    ];

    renderComponent({
      onEsQueryChange: mockedOnEsQueryChange,
      rangeFrom: mockedFrom,
      rangeTo: mockedTo,
      defaultSearchQueries,
      status: 'all',
    });

    expect(mockedOnEsQueryChange).toHaveBeenCalledWith({
      bool: {
        filter: [
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { match: { 'kibana.alert.rule.uuid': '413a9631-1a29-4344-a8b4-9a1dc23421ee' } },
              ],
            },
          },
          {
            range: {
              'kibana.alert.time_range': expect.objectContaining({
                format: 'strict_date_optional_time',
                gte: mockedFrom,
                lte: mockedTo,
              }),
            },
          },
        ],
        must: [],
        must_not: [],
        should: [],
      },
    });
  });
});
