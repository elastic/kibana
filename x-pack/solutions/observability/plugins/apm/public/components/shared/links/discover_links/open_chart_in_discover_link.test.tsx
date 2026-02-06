/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OpenChartInDiscoverLink } from './open_chart_in_discover_link';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';

const MOCK_INDEX_PATTERN = 'traces-*';

jest.mock('../../../../context/apm_service/use_apm_service_context');
jest.mock('../../../../hooks/use_apm_params');
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');
jest.mock('../../../../context/environments_context/use_environments_context');

const mockUseApmServiceContext = useApmServiceContext as jest.MockedFunction<
  typeof useApmServiceContext
>;
const mockUseAnyOfApmParams = useAnyOfApmParams as jest.MockedFunction<any>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;
const mockUseEnvironmentsContext = useEnvironmentsContext as jest.MockedFunction<
  typeof useEnvironmentsContext
>;

const mockGetRedirectUrl = jest.fn();
const mockLocatorGet = jest.fn().mockReturnValue({
  getRedirectUrl: mockGetRedirectUrl,
});

const serviceName = 'test-service';
const transactionType = 'request';

describe('OpenChartInDiscoverLink', () => {
  beforeEach(() => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName,
      transactionType,
      indexSettings: [
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
      indexSettingsStatus: FETCH_STATUS.SUCCESS,
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

    mockUseEnvironmentsContext.mockReturnValue({
      environment: 'production',
    } as any);

    mockUseAnyOfApmParams.mockReturnValue({
      query: {
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });

    mockGetRedirectUrl.mockReturnValue('http://test-discover-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate ESQL query with service name and transaction type', () => {
    render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE \`${SERVICE_NAME}\` == "${serviceName}"\n  | WHERE \`${SERVICE_ENVIRONMENT}\` == "production"\n  | WHERE \`${TRANSACTION_TYPE}\` == "${transactionType}"`,
      },
    });
  });

  it('should generate ESQL query with transaction name filter', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        transactionName: 'GET /api/users',
      },
    });

    render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE \`${SERVICE_NAME}\` == "${serviceName}"\n  | WHERE \`${SERVICE_ENVIRONMENT}\` == "production"\n  | WHERE \`${TRANSACTION_NAME}\` == "GET /api/users"\n  | WHERE \`${TRANSACTION_TYPE}\` == "${transactionType}"`,
      },
    });
  });

  it('should generate ESQL query with kuery filter', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        kuery: 'user.id: "123"',
      },
    });

    render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE \`${SERVICE_NAME}\` == "${serviceName}"\n  | WHERE \`${SERVICE_ENVIRONMENT}\` == "production"\n  | WHERE \`${TRANSACTION_TYPE}\` == "${transactionType}"\n  | WHERE KQL("user.id: \\"123\\"")`,
      },
    });
  });

  it('should skip environment filter for ENVIRONMENT_ALL', () => {
    mockUseEnvironmentsContext.mockReturnValue({
      environment: 'ENVIRONMENT_ALL',
    } as any);

    render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE \`${SERVICE_NAME}\` == "${serviceName}"\n  | WHERE \`${TRANSACTION_TYPE}\` == "${transactionType}"`,
      },
    });
  });

  it('should skip environment filter for ENVIRONMENT_NOT_DEFINED', () => {
    mockUseEnvironmentsContext.mockReturnValue({
      environment: 'ENVIRONMENT_NOT_DEFINED',
    } as any);

    render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE \`${SERVICE_NAME}\` == "${serviceName}"\n  | WHERE \`${TRANSACTION_TYPE}\` == "${transactionType}"`,
      },
    });
  });

  it('should render link with correct props', () => {
    const { getByTestId } = render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    const link = getByTestId('testId');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'http://test-discover-url');
    expect(link).toHaveTextContent('Open in Discover');
  });

  it('should render link with disabled state when indexSettings is empty', () => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName,
      transactionType,
      indexSettings: [],
      indexSettingsStatus: FETCH_STATUS.SUCCESS,
    } as any);

    const { getByTestId } = render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    const link = getByTestId('testId');
    expect(link).toBeInTheDocument();
    expect(link).toBeDisabled();
    expect(link).toHaveTextContent('Open in Discover');
  });

  it('should render link with disabled state when indexSettingsStatus is not SUCCESS', () => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName,
      transactionType,
      indexSettings: [
        {
          configurationName: 'transaction',
          defaultValue: MOCK_INDEX_PATTERN,
        },
      ],
      indexSettingsStatus: FETCH_STATUS.LOADING,
    } as any);

    const { getByTestId } = render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    const link = getByTestId('testId');
    expect(link).toBeInTheDocument();
    expect(link).toBeDisabled();
  });

  it('should generate ESQL query without transaction type when not provided', () => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName,
      transactionType: undefined,
      indexSettings: [
        {
          configurationName: 'transaction',
          defaultValue: MOCK_INDEX_PATTERN,
        },
      ],
      indexSettingsStatus: FETCH_STATUS.SUCCESS,
    } as any);

    render(<OpenChartInDiscoverLink dataTestSubj="testId" />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE \`${SERVICE_NAME}\` == "${serviceName}"\n  | WHERE \`${SERVICE_ENVIRONMENT}\` == "production"`,
      },
    });
  });
});
