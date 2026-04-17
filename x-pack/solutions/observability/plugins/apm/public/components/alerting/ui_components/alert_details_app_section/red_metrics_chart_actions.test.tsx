/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { RedMetricsChartActions } from './red_metrics_chart_actions';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import { SERVICE_NAME, TRANSACTION_TYPE } from '@kbn/apm-types';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn().mockReturnValue({ services: {} }),
}));

jest.mock('../../../../hooks/use_fetcher');

const { useKibana } = jest.requireMock('@kbn/kibana-react-plugin/public');
const { useFetcher } = jest.requireMock('../../../../hooks/use_fetcher');

const MOCK_TRACES_INDEX = 'traces-apm-*';

const mockApmGetRedirectUrl = jest.fn().mockReturnValue('http://test-apm-url');
const mockDiscoverGetRedirectUrl = jest.fn().mockReturnValue('http://test-discover-url');

const defaultProps = {
  queryParams: {
    serviceName: 'testService',
    environment: 'testEnvironment',
    transactionName: 'testTransaction',
    transactionType: 'testTransactionType',
  },
  timeRange: { from: 'now-15m', to: 'now' },
  ruleTypeId: 'apm.transaction_duration',
};

const setupMocks = ({
  hasShare = true,
  hasIndexSettings = true,
}: { hasShare?: boolean; hasIndexSettings?: boolean } = {}) => {
  if (hasShare) {
    useKibana.mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: (id: string) => {
                if (id === APM_APP_LOCATOR_ID) {
                  return { getRedirectUrl: mockApmGetRedirectUrl };
                }
                if (id === DISCOVER_APP_LOCATOR) {
                  return { getRedirectUrl: mockDiscoverGetRedirectUrl };
                }
                return undefined;
              },
            },
          },
        },
        apmSourcesAccess: {
          getApmIndexSettings: jest.fn(),
        },
      },
    });
  } else {
    useKibana.mockReturnValue({ services: {} });
  }

  if (hasIndexSettings) {
    useFetcher.mockReturnValue({
      data: {
        apmIndexSettings: [
          { configurationName: 'transaction', defaultValue: MOCK_TRACES_INDEX },
          {
            configurationName: 'span',
            savedValue: MOCK_TRACES_INDEX,
            defaultValue: 'traces-otel-*',
          },
        ],
      },
      status: FETCH_STATUS.SUCCESS,
    });
  } else {
    useFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.LOADING,
    });
  }
};

describe('RedMetricsChartActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the "Open" dropdown button', () => {
    setupMocks();
    const { getByTestId } = render(<RedMetricsChartActions {...defaultProps} />);

    const button = getByTestId('apmAlertDetailsOpenActionsDropdown');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Open');
  });

  it('opens popover with menu items on click', () => {
    setupMocks();
    const { getByTestId } = render(<RedMetricsChartActions {...defaultProps} />);

    fireEvent.click(getByTestId('apmAlertDetailsOpenActionsDropdown'));

    expect(getByTestId('apmAlertDetailsOpenInApmAction')).toBeInTheDocument();
    expect(getByTestId('apmAlertDetailsTracesOpenInDiscoverAction')).toBeInTheDocument();
  });

  it('includes ruleTypeId in data-source attributes', () => {
    setupMocks();
    const { getByTestId } = render(<RedMetricsChartActions {...defaultProps} />);

    fireEvent.click(getByTestId('apmAlertDetailsOpenActionsDropdown'));

    expect(getByTestId('apmAlertDetailsOpenInApmAction')).toHaveAttribute(
      'data-source',
      'alertDetails-apm.transaction_duration'
    );
    expect(getByTestId('apmAlertDetailsTracesOpenInDiscoverAction')).toHaveAttribute(
      'data-source',
      'alertDetails-apm.transaction_duration'
    );
  });

  describe('In APM action', () => {
    it('renders an href linking to APM', () => {
      setupMocks();
      const { getByTestId } = render(<RedMetricsChartActions {...defaultProps} />);

      fireEvent.click(getByTestId('apmAlertDetailsOpenActionsDropdown'));

      expect(getByTestId('apmAlertDetailsOpenInApmAction')).toHaveAttribute(
        'href',
        'http://test-apm-url'
      );
    });

    it('passes correct params to the APM locator', () => {
      setupMocks();
      render(<RedMetricsChartActions {...defaultProps} />);

      expect(mockApmGetRedirectUrl).toHaveBeenCalledWith({
        serviceName: 'testService',
        serviceOverviewTab: 'transactions',
        query: {
          environment: 'testEnvironment',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
          transactionName: 'testTransaction',
          transactionType: 'testTransactionType',
        },
      });
    });

    it('does not set serviceOverviewTab when transactionName is not provided', () => {
      setupMocks();
      render(
        <RedMetricsChartActions
          queryParams={{
            serviceName: 'testService',
            environment: 'testEnvironment',
            transactionType: 'testTransactionType',
          }}
          timeRange={{ from: 'now-15m', to: 'now' }}
          ruleTypeId="apm.transaction_duration"
        />
      );

      expect(mockApmGetRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceOverviewTab: undefined,
        })
      );
    });
  });

  describe('Traces in Discover action', () => {
    it('renders an href with a correct ESQL query', () => {
      setupMocks();
      const { getByTestId } = render(<RedMetricsChartActions {...defaultProps} />);

      fireEvent.click(getByTestId('apmAlertDetailsOpenActionsDropdown'));

      expect(getByTestId('apmAlertDetailsTracesOpenInDiscoverAction')).toHaveAttribute(
        'href',
        'http://test-discover-url'
      );

      const esqlArg = mockDiscoverGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
      expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "testService"`);
      expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "testTransactionType"`);
      expect(esqlArg).toContain('SORT @timestamp DESC');
    });

    it('disables the Discover item when index settings are not loaded', () => {
      setupMocks({ hasIndexSettings: false });
      const { getByTestId } = render(<RedMetricsChartActions {...defaultProps} />);

      fireEvent.click(getByTestId('apmAlertDetailsOpenActionsDropdown'));

      expect(getByTestId('apmAlertDetailsTracesOpenInDiscoverAction')).not.toHaveAttribute('href');
    });
  });
});
