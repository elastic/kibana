/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ViewInDiscoverButton } from './view_in_discover_button';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  SERVICE_ENVIRONMENT,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
  SERVICE_NAME,
  SPAN_NAME,
  TRANSACTION_NAME,
} from '@kbn/apm-types';

const MOCK_INDEX_PATTERN = 'traces-*';

jest.mock('../../../../context/apm_service/use_apm_service_context');
jest.mock('../../../../hooks/use_apm_params');
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => ({
    services: {
      apmSourcesAccess: {
        getApmIndexSettings: jest.fn(),
      },
    },
  }),
}));
jest.mock('../../../../hooks/use_fetcher', () => {
  const originalUseFetcher = jest.requireActual('../../../../hooks/use_fetcher').useFetcher;
  return {
    ...jest.requireActual('../../../../hooks/use_fetcher'),
    useFetcher: jest.fn((fn, deps) => {
      // Only mock when used with apmSourcesAccess.getApmIndexSettings
      if (deps && deps[0]?.getApmIndexSettings) {
        return {
          data: {
            apmIndexSettings: [
              {
                configurationName: 'transaction',
                defaultValue: MOCK_INDEX_PATTERN,
              },
              {
                configurationName: 'span',
                savedValue: MOCK_INDEX_PATTERN,
                defaultValue: 'traces-otel-*',
              },
              {
                configurationName: 'test',
                savedValue: 'fake-index',
                defaultValue: 'fake-*',
              },
            ],
          },
        };
      }
      // Use the real useFetcher for other calls
      return originalUseFetcher(fn, deps);
    }),
  };
});

const mockUseApmServiceContext = useApmServiceContext as jest.MockedFunction<
  typeof useApmServiceContext
>;
const mockUseAnyOfApmParams = useAnyOfApmParams as jest.MockedFunction<any>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const mockGetRedirectUrl = jest.fn();
const mockLocatorGet = jest.fn().mockReturnValue({
  getRedirectUrl: mockGetRedirectUrl,
});

const serviceName = 'test-service';

describe('ViewInDiscoverButton', () => {
  beforeEach(() => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName,
    } as any);

    mockUseApmPluginContext.mockReturnValue({
      share: {
        url: {
          locators: {
            get: mockLocatorGet,
          },
        },
      },
    } as any);

    mockUseAnyOfApmParams.mockReturnValue({
      query: {},
    });

    mockGetRedirectUrl.mockReturnValue('http://test-discover-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate ESQL query with service name only', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });

    render(<ViewInDiscoverButton />);

    expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"`,
      },
    });
  });

  it('should generate ESQL query with transaction filters', () => {
    const query = {
      transactionName: 'GET /api/test',
      transactionType: 'request',
      environment: 'production',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };

    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE ${SERVICE_ENVIRONMENT} == "${query.environment}"\n  | WHERE ${TRANSACTION_NAME} == "${query.transactionName}"\n  | WHERE ${TRANSACTION_TYPE} == "${query.transactionType}"`,
      },
    });
  });

  it('should generate ESQL query with span filters', () => {
    const query = {
      spanName: 'elasticsearch-query',
      dependencyName: 'elasticsearch',
      environment: 'staging',
      sampleRangeFrom: 1000,
      sampleRangeTo: 5000,
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };

    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE ${SERVICE_ENVIRONMENT} == "${query.environment}"\n  | WHERE ${SPAN_NAME} == "${query.spanName}"\n  | WHERE ${SPAN_DESTINATION_SERVICE_RESOURCE} == "${query.dependencyName}"\n  | WHERE ${SPAN_DURATION} >= ${query.sampleRangeFrom} AND ${SPAN_DURATION} <= ${query.sampleRangeTo}`,
      },
    });
  });

  it('should generate ESQL query with duration filters for transactions', () => {
    const query = {
      transactionName: 'POST /api/data',
      sampleRangeFrom: 1000,
      sampleRangeTo: 5000,
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE ${TRANSACTION_NAME} == "${query.transactionName}"\n  | WHERE ${TRANSACTION_DURATION} >= ${query.sampleRangeFrom} AND ${TRANSACTION_DURATION} <= ${query.sampleRangeTo}`,
      },
    });
  });

  it('should generate ESQL query with duration filters for spans', () => {
    const query = {
      spanName: 'db-query',
      sampleRangeFrom: 500,
      sampleRangeTo: 2000,
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE ${SPAN_NAME} == "${query.spanName}"\n  | WHERE ${SPAN_DURATION} >= ${query.sampleRangeFrom} AND ${SPAN_DURATION} <= ${query.sampleRangeTo}`,
      },
    });
  });

  it('should generate ESQL query with kuery filter', () => {
    const query = {
      kuery: 'user.id: "123" AND status_code: 200',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE QSTR("user.id: \\"123\\" AND status_code: 200")`,
      },
    });
  });

  it('should skip environment filter for ENVIRONMENT_ALL_VALUE', () => {
    const query = {
      environment: 'ENVIRONMENT_ALL',
      transactionName: 'test-transaction',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE ${TRANSACTION_NAME} == "${query.transactionName}"`,
      },
    });
  });

  it('should skip environment filter for ENVIRONMENT_NOT_DEFINED_VALUE', () => {
    const query = {
      environment: 'ENVIRONMENT_NOT_DEFINED',
      transactionName: 'test-transaction',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE ${TRANSACTION_NAME} == "${query.transactionName}"`,
      },
    });
  });

  it('should generate comprehensive ESQL query with all parameters', () => {
    const query = {
      transactionName: 'GET /api/comprehensive',
      transactionType: 'request',
      spanName: 'db-operation',
      dependencyName: 'postgres',
      environment: 'production',
      sampleRangeFrom: 1000,
      sampleRangeTo: 10000,
      kuery: 'error.message: "timeout"',
      rangeFrom: 'now-1h',
      rangeTo: 'now',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscoverButton />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-1h',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SERVICE_NAME} == "${serviceName}"\n  | WHERE ${SERVICE_ENVIRONMENT} == "${query.environment}"\n  | WHERE ${TRANSACTION_NAME} == "${query.transactionName}"\n  | WHERE ${TRANSACTION_TYPE} == "${query.transactionType}"\n  | WHERE ${SPAN_DESTINATION_SERVICE_RESOURCE} == "${query.dependencyName}"\n  | WHERE ${TRANSACTION_DURATION} >= ${query.sampleRangeFrom} AND ${TRANSACTION_DURATION} <= ${query.sampleRangeTo}\n  | WHERE QSTR("error.message: \\"timeout\\"")`,
      },
    });
  });

  it('should render button with correct props', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {},
    });

    const { getByTestId } = render(<ViewInDiscoverButton />);

    const button = getByTestId('apmWaterfallWithSummaryViewInDiscoverButton');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://test-discover-url');
    expect(button).toHaveTextContent('View in Discover');
  });
});
