/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { SPAN_ID } from '@kbn/apm-types';
import { ViewSpanInDiscoverLink } from './view_span_in_discover_link';

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

const mockUseAnyOfApmParams = useAnyOfApmParams as jest.MockedFunction<any>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const mockGetRedirectUrl = jest.fn();
const mockLocatorGet = jest.fn().mockReturnValue({
  getRedirectUrl: mockGetRedirectUrl,
});

const spanId = 'test-span-id';

describe('ViewSpanInDiscoverLink', () => {
  beforeEach(() => {
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

  it('should generate ESQL query with span id filter', () => {
    const query = {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };

    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewSpanInDiscoverLink dataTestSubj="testId" spanId={spanId} />);
    expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SPAN_ID} == "${spanId}"`,
      },
    });
  });

  it('should generate ESQL query with span id and kuery filter', () => {
    const query = {
      kuery: 'user.id: "123" AND status_code: 200',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    };
    mockUseAnyOfApmParams.mockReturnValue({
      query,
    });

    render(<ViewSpanInDiscoverLink dataTestSubj="testId" spanId={spanId} />);

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      query: {
        esql: `FROM ${MOCK_INDEX_PATTERN}\n  | WHERE ${SPAN_ID} == "${spanId}"\n  | WHERE KQL("user.id: \\"123\\" AND status_code: 200")`,
      },
    });
  });

  it('should render button with correct props', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {},
    });

    const { getByTestId } = render(
      <ViewSpanInDiscoverLink dataTestSubj="testId" spanId={spanId} />
    );

    const button = getByTestId('testId');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://test-discover-url');
    expect(button).toHaveTextContent('View span in Discover');
  });
});
