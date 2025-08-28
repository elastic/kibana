/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { ERROR_GROUP_ID, SERVICE_NAME } from '@kbn/apm-types';
import { OpenErrorInDiscoverButton } from './open_error_in_discover_button';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';

const MOCK_INDEX_PATTERN = 'logs-*';

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
                configurationName: 'test',
                savedValue: 'fake-index',
                defaultValue: 'fake-*',
              },
              {
                configurationName: 'error',
                savedValue: MOCK_INDEX_PATTERN,
                defaultValue: 'error-*',
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
const mockUseApmParams = useApmParams as jest.MockedFunction<any>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const mockGetRedirectUrl = jest.fn();
const mockLocatorGet = jest.fn().mockReturnValue({
  getRedirectUrl: mockGetRedirectUrl,
});

const errorGroupId = 'test-error-group-id';
const serviceName = 'test-service';

describe('OpenErrorInDiscoverButton', () => {
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

    mockUseApmParams.mockReturnValue({
      query: {},
    });

    mockGetRedirectUrl.mockReturnValue('http://test-discover-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate ESQL query with error group id filters', () => {
    const query = {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };

    mockUseApmServiceContext.mockReturnValue({
      serviceName: '',
    } as any);

    mockUseApmParams.mockReturnValue({
      query,
      path: { groupId: errorGroupId },
    });

    render(<OpenErrorInDiscoverButton dataTestSubj="testId" />);
    expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${ERROR_GROUP_ID} == "${errorGroupId}"`,
      },
    });
  });

  it('should generate ESQL query with error group id and service name filter', () => {
    const query = {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseApmParams.mockReturnValue({
      query,
      path: { groupId: errorGroupId },
    });

    render(<OpenErrorInDiscoverButton dataTestSubj="testId" />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${ERROR_GROUP_ID} == "${errorGroupId}"\n  | WHERE ${SERVICE_NAME} == "${serviceName}"`,
      },
    });
  });

  it('should generate ESQL query with error group id and kuery filter', () => {
    const query = {
      kuery: 'user.id: "123" AND status_code: 200',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseApmServiceContext.mockReturnValue({
      serviceName: '',
    } as any);
    mockUseApmParams.mockReturnValue({
      query,
      path: { groupId: errorGroupId },
    });

    render(<OpenErrorInDiscoverButton dataTestSubj="testId" />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${ERROR_GROUP_ID} == "${errorGroupId}"\n  | WHERE KQL("user.id: \\"123\\" AND status_code: 200")`,
      },
    });
  });

  it('should render button with correct props', () => {
    mockUseApmParams.mockReturnValue({
      query: {},
      path: { groupId: errorGroupId },
    });

    const { getByTestId } = render(<OpenErrorInDiscoverButton dataTestSubj="testId" />);

    const button = getByTestId('testId');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://test-discover-url');
    expect(button).toHaveTextContent('Open error in Discover');
  });
});
