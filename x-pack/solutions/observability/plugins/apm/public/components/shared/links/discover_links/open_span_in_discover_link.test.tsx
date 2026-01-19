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
import { OpenSpanInDiscoverLink } from './open_span_in_discover_link';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';

const MOCK_INDEX_PATTERN = 'traces-*';

jest.mock('../../../../context/apm_service/use_apm_service_context');
jest.mock('../../../../hooks/use_apm_params');
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');

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

const spanId = 'test-span-id';

describe('OpenSpanInDiscoverLink', () => {
  beforeEach(() => {
    mockUseApmServiceContext.mockReturnValue({
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

    render(<OpenSpanInDiscoverLink dataTestSubj="testId" spanId={spanId} />);
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

    render(<OpenSpanInDiscoverLink dataTestSubj="testId" spanId={spanId} />);

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
      <OpenSpanInDiscoverLink dataTestSubj="testId" spanId={spanId} />
    );

    const button = getByTestId('testId');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://test-discover-url');
    expect(button).toHaveTextContent('Open in Discover');
  });

  it('should render button with disabled state', () => {
    mockUseAnyOfApmParams.mockReturnValue({
      query: {},
    });
    mockUseApmServiceContext.mockReturnValue({
      indexSettings: [],
      indexSettingsStatus: FETCH_STATUS.SUCCESS,
    } as any);

    const { getByTestId } = render(
      <OpenSpanInDiscoverLink dataTestSubj="testId" spanId={spanId} />
    );

    const button = getByTestId('testId');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Open in Discover');
  });
});
