/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ViewInDiscover } from './view_in_discover';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';

jest.mock('../../../../context/apm_service/use_apm_service_context');
jest.mock('../../../../hooks/use_apm_params');
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');
jest.mock('../../../../hooks/use_adhoc_apm_data_view', () => ({
  useAdHocApmDataView: () => ({
    dataView: {
      id: 'apm_0',
      getIndexPattern: () => 'traces-*',
    },
  }),
}));
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

describe('ViewInDiscover', () => {
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
      query: {},
    });

    render(<ViewInDiscover />);

    expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"`,
      },
    });
  });

  it('should generate ESQL query with transaction filters', () => {
    const query = {
      transactionName: 'GET /api/test',
      transactionType: 'request',
      environment: 'production',
    };

    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE service.environment == "${query.environment}"\n  | WHERE transaction.name == "${query.transactionName}"\n  | WHERE transaction.type == "${query.transactionType}"`,
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
    };

    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE service.environment == "${query.environment}"\n  | WHERE span.name == "${query.spanName}"\n  | WHERE span.destination.service.resource == "${query.dependencyName}"\n  | WHERE span.duration.us >= ${query.sampleRangeFrom} AND span.duration.us <= ${query.sampleRangeTo}`,
      },
    });
  });

  it('should generate ESQL query with duration filters for transactions', () => {
    const query = {
      transactionName: 'POST /api/data',
      sampleRangeFrom: 1000,
      sampleRangeTo: 5000,
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE transaction.name == "${query.transactionName}"\n  | WHERE transaction.duration.us >= ${query.sampleRangeFrom} AND transaction.duration.us <= ${query.sampleRangeTo}`,
      },
    });
  });

  it('should generate ESQL query with duration filters for spans', () => {
    const query = {
      spanName: 'db-query',
      sampleRangeFrom: 500,
      sampleRangeTo: 2000,
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE span.name == "${query.spanName}"\n  | WHERE span.duration.us >= ${query.sampleRangeFrom} AND span.duration.us <= ${query.sampleRangeTo}`,
      },
    });
  });

  it('should generate ESQL query with kuery filter', () => {
    const query = {
      kuery: 'user.id: "123" AND status_code: 200',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE QSTR("user.id: \\"123\\" AND status_code: 200")`,
      },
    });
  });

  it('should skip environment filter for ENVIRONMENT_ALL_VALUE', () => {
    const query = {
      environment: 'ENVIRONMENT_ALL',
      transactionName: 'test-transaction',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE transaction.name == "${query.transactionName}"`,
      },
    });
  });

  it('should skip environment filter for ENVIRONMENT_NOT_DEFINED_VALUE', () => {
    const query = {
      environment: 'ENVIRONMENT_NOT_DEFINED',
      transactionName: 'test-transaction',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE transaction.name == "${query.transactionName}"`,
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
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewInDiscover />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      query: {
        esql: `FROM traces-*\n  | WHERE service.name == "${serviceName}"\n  | WHERE service.environment == "${query.environment}"\n  | WHERE transaction.name == "${query.transactionName}"\n  | WHERE transaction.type == "${query.transactionType}"\n  | WHERE span.destination.service.resource == "${query.dependencyName}"\n  | WHERE transaction.duration.us >= ${query.sampleRangeFrom} AND transaction.duration.us <= ${query.sampleRangeTo}\n  | WHERE QSTR("error.message: \\"timeout\\"")`,
      },
    });
  });

  it('should render button with correct props', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {},
    });

    const { getByTestId } = render(<ViewInDiscover />);

    const button = getByTestId('apmWaterfallWithSummaryViewInDiscoverButton');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://test-discover-url');
    expect(button).toHaveTextContent('View in Discover');
  });
});
