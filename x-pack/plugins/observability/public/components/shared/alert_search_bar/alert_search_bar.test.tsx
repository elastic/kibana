/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { AlertSearchBarProps } from './types';
import { ObservabilityAlertSearchBar } from './alert_search_bar';
import { observabilityAlertFeatureIds } from '../../../config';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { render } from '../../../utils/test_helper';

const useKibanaMock = useKibana as jest.Mock;
const getAlertsSearchBarMock = jest.fn();
const ALERT_SEARCH_BAR_DATA_TEST_SUBJ = 'alerts-search-bar';
const ACTIVE_BUTTON_DATA_TEST_SUBJ = 'alert-status-filter-active-button';

jest.mock('../../../utils/kibana_react');

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      triggersActionsUi: {
        ...triggersActionsUiMock.createStart(),
        getAlertsSearchBar: getAlertsSearchBarMock.mockReturnValue(
          <div data-test-subj={ALERT_SEARCH_BAR_DATA_TEST_SUBJ} />
        ),
      },
    },
  });
};

describe('ObservabilityAlertSearchBar', () => {
  const renderComponent = (props: Partial<AlertSearchBarProps> = {}) => {
    const alertSearchBarProps: AlertSearchBarProps = {
      appName: 'testAppName',
      rangeFrom: 'now-15m',
      setRangeFrom: jest.fn(),
      rangeTo: 'now',
      setRangeTo: jest.fn(),
      kuery: '',
      setKuery: jest.fn(),
      status: 'active',
      setStatus: jest.fn(),
      setEsQuery: jest.fn(),
      ...props,
    };
    return render(<ObservabilityAlertSearchBar {...alertSearchBarProps} />);
  };

  beforeAll(() => {
    mockKibana();
  });

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
    act(() => {
      renderComponent();
    });

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
    const mockedSetEsQuery = jest.fn();
    const mockedFrom = '2022-11-15T09:38:13.604Z';
    const mockedTo = '2022-11-15T09:53:13.604Z';
    const { getByTestId } = renderComponent({
      setEsQuery: mockedSetEsQuery,
      rangeFrom: mockedFrom,
      rangeTo: mockedTo,
    });

    await act(async () => {
      const activeButton = getByTestId(ACTIVE_BUTTON_DATA_TEST_SUBJ);
      activeButton.click();
    });

    expect(mockedSetEsQuery).toHaveBeenCalledWith({
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
              '@timestamp': expect.objectContaining({
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
