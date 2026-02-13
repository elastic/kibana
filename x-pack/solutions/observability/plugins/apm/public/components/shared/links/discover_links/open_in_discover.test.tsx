/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OpenInDiscover } from './open_in_discover';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';

const MOCK_TRACES_INDEX = 'traces-apm-*';
const MOCK_ERROR_INDEX = 'logs-apm.error-*';

jest.mock('../../../../context/apm_service/use_apm_service_context');
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');

const mockUseApmServiceContext = useApmServiceContext as jest.MockedFunction<
  typeof useApmServiceContext
>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const mockGetRedirectUrl = jest.fn();
const mockLocatorGet = jest.fn().mockReturnValue({
  getRedirectUrl: mockGetRedirectUrl,
});

describe('OpenInDiscover', () => {
  beforeEach(() => {
    mockUseApmServiceContext.mockReturnValue({
      serviceName: 'test-service',
      transactionType: 'request',
      indexSettings: [
        {
          configurationName: 'transaction',
          defaultValue: MOCK_TRACES_INDEX,
        },
        {
          configurationName: 'span',
          savedValue: MOCK_TRACES_INDEX,
          defaultValue: 'traces-otel-*',
        },
        {
          configurationName: 'error',
          savedValue: MOCK_ERROR_INDEX,
          defaultValue: 'logs-apm.error-default-*',
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

    mockGetRedirectUrl.mockReturnValue('http://test-discover-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('button variant', () => {
    it('should render a button with correct props', () => {
      const { getByTestId } = render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{ serviceName: 'my-service' }}
        />
      );

      const button = getByTestId('testButton');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Open in Discover');
    });

    it('should generate correct ESQL query and pass it to the locator', () => {
      render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{ serviceName: 'my-service', transactionType: 'request' }}
        />
      );

      expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
      expect(mockGetRedirectUrl).toHaveBeenCalledWith({
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
        query: {
          esql: expect.stringContaining(`\`${SERVICE_NAME}\` == "my-service"`),
        },
      });
    });

    it('should be disabled when indexSettings is empty', () => {
      mockUseApmServiceContext.mockReturnValue({
        serviceName: 'test-service',
        transactionType: 'request',
        indexSettings: [],
        indexSettingsStatus: FETCH_STATUS.SUCCESS,
      } as any);

      const { getByTestId } = render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{}}
        />
      );

      const button = getByTestId('testButton');
      expect(button).toBeDisabled();
    });

    it('should show loading state when indexSettingsStatus is LOADING', () => {
      mockUseApmServiceContext.mockReturnValue({
        serviceName: 'test-service',
        transactionType: 'request',
        indexSettings: [
          {
            configurationName: 'transaction',
            defaultValue: MOCK_TRACES_INDEX,
          },
        ],
        indexSettingsStatus: FETCH_STATUS.LOADING,
      } as any);

      const { getByTestId } = render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{}}
        />
      );

      const button = getByTestId('testButton');
      expect(button).toBeDisabled();
    });
  });

  describe('link variant', () => {
    it('should render a link with correct props', () => {
      const { getByTestId } = render(
        <OpenInDiscover
          variant="link"
          dataTestSubj="testLink"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{ serviceName: 'my-service' }}
        />
      );

      const link = getByTestId('testLink');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'http://test-discover-url');
      expect(link).toHaveTextContent('Open in Discover');
    });

    it('should render disabled link when indexSettings is empty', () => {
      mockUseApmServiceContext.mockReturnValue({
        serviceName: 'test-service',
        transactionType: 'request',
        indexSettings: [],
        indexSettingsStatus: FETCH_STATUS.SUCCESS,
      } as any);

      const { getByTestId } = render(
        <OpenInDiscover
          variant="link"
          dataTestSubj="testLink"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{}}
        />
      );

      const link = getByTestId('testLink');
      expect(link).toBeInTheDocument();
      expect(link).toBeDisabled();
    });

    it('should render disabled link when indexSettingsStatus is not SUCCESS', () => {
      mockUseApmServiceContext.mockReturnValue({
        serviceName: 'test-service',
        transactionType: 'request',
        indexSettings: [
          {
            configurationName: 'transaction',
            defaultValue: MOCK_TRACES_INDEX,
          },
        ],
        indexSettingsStatus: FETCH_STATUS.LOADING,
      } as any);

      const { getByTestId } = render(
        <OpenInDiscover
          variant="link"
          dataTestSubj="testLink"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{}}
        />
      );

      const link = getByTestId('testLink');
      expect(link).toBeInTheDocument();
      expect(link).toBeDisabled();
    });
  });

  describe('ESQL query generation', () => {
    it('should generate traces ESQL query with service name and transaction type', () => {
      render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{ serviceName: 'my-service', transactionType: 'request' }}
        />
      );

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
      expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
      expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
    });

    it('should generate traces ESQL query with transaction name filter', () => {
      render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{ serviceName: 'my-service', transactionName: 'GET /api/users' }}
        />
      );

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
    });

    it('should generate error ESQL query with error index', () => {
      render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="error"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{ serviceName: 'my-service', errorGroupId: 'error-123' }}
        />
      );

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`FROM ${MOCK_ERROR_INDEX}`);
      expect(esqlArg).not.toContain(MOCK_TRACES_INDEX);
    });

    it('should generate ESQL query with span ID for span view', () => {
      render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{ spanId: 'span-456' }}
        />
      );

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`\`${SPAN_ID}\` == "span-456"`);
    });

    it('should return null ESQL query when indexSettings is empty', () => {
      mockUseApmServiceContext.mockReturnValue({
        serviceName: 'test-service',
        transactionType: 'request',
        indexSettings: [],
        indexSettingsStatus: FETCH_STATUS.SUCCESS,
      } as any);

      render(
        <OpenInDiscover
          variant="button"
          dataTestSubj="testButton"
          indexType="traces"
          rangeFrom="now-15m"
          rangeTo="now"
          queryParams={{}}
        />
      );

      expect(mockGetRedirectUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { esql: null },
        })
      );
    });
  });

  describe('consumer scenarios', () => {
    describe('waterfall (transaction details) context', () => {
      it('should generate correct query with service, transaction, and sample range params', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="apmWaterfallOpenInDiscoverButton"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              kuery: 'service.language.name: java',
              serviceName: 'my-service',
              environment: 'production',
              transactionName: 'GET /api/users',
              transactionType: 'request',
              sampleRangeFrom: 1000,
              sampleRangeTo: 5000,
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_DURATION}\` >= 1000`);
        expect(esqlArg).toContain(`\`${TRANSACTION_DURATION}\` <= 5000`);
        expect(esqlArg).toContain('KQL("service.language.name: java")');
      });

      it('should generate query without sample range when not provided', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="apmWaterfallOpenInDiscoverButton"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              serviceName: 'my-service',
              environment: 'production',
              transactionName: 'GET /api/users',
              transactionType: 'request',
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
        expect(esqlArg).not.toContain(SPAN_DURATION);
      });
    });

    describe('dependency operation context', () => {
      it('should generate correct query with dependency-specific params', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="apmWaterfallOpenInDiscoverButton"
            indexType="traces"
            rangeFrom="now-24h"
            rangeTo="now"
            queryParams={{
              kuery: '',
              serviceName: 'upstream-service',
              environment: 'staging',
              spanName: 'SELECT * FROM users',
              dependencyName: 'postgresql',
              sampleRangeFrom: 500,
              sampleRangeTo: 2000,
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "upstream-service"`);
        expect(esqlArg).toContain(`\`${SERVICE_ENVIRONMENT}\` == "staging"`);
        expect(esqlArg).toContain(`\`${SPAN_NAME}\` == "SELECT * FROM users"`);
        expect(esqlArg).toContain(`\`${SPAN_DESTINATION_SERVICE_RESOURCE}\` == "postgresql"`);
        expect(esqlArg).toContain(`\`${SPAN_DURATION}\` >= 500`);
        expect(esqlArg).toContain(`\`${SPAN_DURATION}\` <= 2000`);
        // transactionName is not set, so SPAN_DURATION is used instead of TRANSACTION_DURATION
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
      });
    });

    describe('trace explorer context', () => {
      it('should generate minimal query with only kuery and environment', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="apmWaterfallOpenInDiscoverButton"
            indexType="traces"
            rangeFrom="now-1h"
            rangeTo="now"
            queryParams={{
              kuery: 'trace.id: "abc123"',
              serviceName: 'discovered-service',
              environment: 'production',
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "discovered-service"`);
        expect(esqlArg).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
        expect(esqlArg).toContain('KQL("trace.id: \\"abc123\\"")');
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
        expect(esqlArg).not.toContain(TRANSACTION_TYPE);
        expect(esqlArg).not.toContain(SPAN_NAME);
      });
    });

    describe('chart link context', () => {
      it('should generate correct query for latency/throughput/error rate charts', () => {
        render(
          <OpenInDiscover
            variant="link"
            dataTestSubj="apmLatencyChartOpenInDiscover"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              kuery: '',
              serviceName: 'my-service',
              environment: 'production',
              transactionName: 'GET /api/users',
              transactionType: 'request',
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
        // charts don't pass sample range
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
        expect(esqlArg).not.toContain(SPAN_DURATION);
      });

      it('should generate correct query for overview charts without transactionName', () => {
        render(
          <OpenInDiscover
            variant="link"
            dataTestSubj="apmServiceOverviewThroughputChartOpenInDiscover"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              kuery: '',
              serviceName: 'my-service',
              environment: 'production',
              transactionType: 'request',
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
      });
    });

    describe('correlations context', () => {
      it('should generate correct query with sample range for correlations', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="apmLatencyCorrelationsOpenInDiscoverButton"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              kuery: '',
              serviceName: 'my-service',
              environment: 'production',
              transactionName: 'GET /api/users',
              transactionType: 'request',
              sampleRangeFrom: 2000,
              sampleRangeTo: 8000,
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_DURATION}\` >= 2000`);
        expect(esqlArg).toContain(`\`${TRANSACTION_DURATION}\` <= 8000`);
      });

      it('should generate correct query without sample range when chart is not brushed', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="apmFailedCorrelationsViewInDiscoverButton"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              kuery: '',
              serviceName: 'my-service',
              environment: 'production',
              transactionName: 'GET /api/users',
              transactionType: 'request',
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
      });
    });

    describe('error sample context', () => {
      it('should generate correct query with error index and error group ID', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="errorGroupDetailsOpenErrorInDiscoverButton"
            indexType="error"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              kuery: '',
              serviceName: 'my-service',
              errorGroupId: 'abc123def456',
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`FROM ${MOCK_ERROR_INDEX}`);
        expect(esqlArg).not.toContain(MOCK_TRACES_INDEX);
        expect(esqlArg).toContain(`\`${ERROR_GROUP_ID}\` == "abc123def456"`);
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
      });
    });

    describe('span flyout context', () => {
      it('should generate correct query with span ID', () => {
        render(
          <OpenInDiscover
            variant="button"
            dataTestSubj="spanFlyoutViewSpanInDiscoverLink"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={{
              kuery: 'service.name: "my-service"',
              spanId: 'span-abc-123',
            }}
          />
        );

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
        expect(esqlArg).toContain(`\`${SPAN_ID}\` == "span-abc-123"`);
        expect(esqlArg).toContain('KQL("service.name: \\"my-service\\"")');
        // span flyout only passes spanId and kuery — no explicit service/transaction filters
        expect(esqlArg).not.toContain(`\`${SERVICE_NAME}\` ==`);
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
      });
    });
  });
});
