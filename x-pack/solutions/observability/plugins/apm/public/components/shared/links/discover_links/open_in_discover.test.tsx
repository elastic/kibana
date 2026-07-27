/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OpenInDiscover } from './open_in_discover';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
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
const MOCK_DATA_TEST_SUBJ = 'testButton';
const MOCK_LABEL = 'Open in Discover';
const MOCK_LABEL_FULL_TRACE = 'Open full trace in Discover';
const MOCK_DISCOVER_URL = 'http://test-discover-url';
const MOCK_SERVICE_NAME = 'my-service';
const MOCK_EBT = { element: 'test' } as const;
const MOCK_RANGE_FROM = 'now-15m';
const MOCK_RANGE_TO = 'now';

jest.mock('../../../../context/apm_index_settings/use_apm_index_settings_context');
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');

const mockUseApmIndexSettingsContext = useApmIndexSettingsContext as jest.MockedFunction<
  typeof useApmIndexSettingsContext
>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const mockGetRedirectUrl = jest.fn();
const mockLocatorGet = jest.fn().mockReturnValue({
  getRedirectUrl: mockGetRedirectUrl,
});

type OpenInDiscoverProps = Parameters<typeof OpenInDiscover>[0];

function renderOpenInDiscover(
  overrides: Partial<OpenInDiscoverProps> & { queryParams: OpenInDiscoverProps['queryParams'] }
) {
  return render(
    <OpenInDiscover
      variant="emptyButton"
      dataTestSubj={MOCK_DATA_TEST_SUBJ}
      label={MOCK_LABEL}
      indexType="traces"
      rangeFrom={MOCK_RANGE_FROM}
      rangeTo={MOCK_RANGE_TO}
      ebt={MOCK_EBT}
      {...overrides}
    />
  );
}

describe('OpenInDiscover', () => {
  beforeEach(() => {
    mockUseApmIndexSettingsContext.mockReturnValue({
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

    mockGetRedirectUrl.mockReturnValue(MOCK_DISCOVER_URL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('emptyButton variant', () => {
    it('should render a button with correct props', () => {
      const { getByTestId } = renderOpenInDiscover({
        queryParams: { serviceName: MOCK_SERVICE_NAME },
      });

      const button = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(MOCK_LABEL);
    });

    it('should render a button with custom label when provided', () => {
      const { getByTestId } = renderOpenInDiscover({
        queryParams: { serviceName: MOCK_SERVICE_NAME },
        label: MOCK_LABEL_FULL_TRACE,
      });

      const button = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(MOCK_LABEL_FULL_TRACE);
    });

    it('should generate correct ESQL query and pass it to the locator', () => {
      renderOpenInDiscover({
        queryParams: { serviceName: MOCK_SERVICE_NAME, transactionType: 'request' },
      });

      expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
      expect(mockGetRedirectUrl).toHaveBeenCalledWith({
        timeRange: {
          from: MOCK_RANGE_FROM,
          to: MOCK_RANGE_TO,
        },
        query: {
          esql: expect.stringContaining(`\`${SERVICE_NAME}\` == "${MOCK_SERVICE_NAME}"`),
        },
      });
    });

    it('should be disabled when indexSettings is empty', () => {
      mockUseApmIndexSettingsContext.mockReturnValue({
        indexSettings: [],
        indexSettingsStatus: FETCH_STATUS.SUCCESS,
      } as any);

      const { getByTestId } = renderOpenInDiscover({ queryParams: {} });

      const button = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(button).toBeDisabled();
    });

    it('should show loading state when indexSettingsStatus is LOADING', () => {
      mockUseApmIndexSettingsContext.mockReturnValue({
        indexSettings: [
          {
            configurationName: 'transaction',
            defaultValue: MOCK_TRACES_INDEX,
          },
        ],
        indexSettingsStatus: FETCH_STATUS.LOADING,
      } as any);

      const { getByTestId } = renderOpenInDiscover({ queryParams: {} });

      const button = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(button).toBeDisabled();
    });
  });

  describe('button variant', () => {
    it('should render an outlined button with custom label', () => {
      const label = 'Explore traces';
      const { getByTestId } = renderOpenInDiscover({
        variant: 'button',
        queryParams: { serviceName: MOCK_SERVICE_NAME },
        label,
      });

      const button = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent(label);
      expect(button).toHaveAttribute('href', MOCK_DISCOVER_URL);
    });

    it('should render disabled outlined button when indexSettingsStatus is not SUCCESS', () => {
      mockUseApmIndexSettingsContext.mockReturnValue({
        indexSettings: [
          {
            configurationName: 'transaction',
            defaultValue: MOCK_TRACES_INDEX,
          },
        ],
        indexSettingsStatus: FETCH_STATUS.LOADING,
      } as any);

      const { getByTestId } = renderOpenInDiscover({
        variant: 'button',
        queryParams: {},
      });

      const button = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(button).toBeDisabled();
    });
  });

  describe('link variant', () => {
    it('should render a link with correct props', () => {
      const { getByTestId } = renderOpenInDiscover({
        variant: 'link',
        queryParams: { serviceName: MOCK_SERVICE_NAME },
      });

      const link = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', MOCK_DISCOVER_URL);
      expect(link).toHaveTextContent(MOCK_LABEL);
    });

    it('should render disabled link when indexSettings is empty', () => {
      mockUseApmIndexSettingsContext.mockReturnValue({
        indexSettings: [],
        indexSettingsStatus: FETCH_STATUS.SUCCESS,
      } as any);

      const { getByTestId } = renderOpenInDiscover({
        variant: 'link',
        queryParams: {},
      });

      const link = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(link).toBeInTheDocument();
      expect(link).toBeDisabled();
    });

    it('should render disabled link when indexSettingsStatus is not SUCCESS', () => {
      mockUseApmIndexSettingsContext.mockReturnValue({
        indexSettings: [
          {
            configurationName: 'transaction',
            defaultValue: MOCK_TRACES_INDEX,
          },
        ],
        indexSettingsStatus: FETCH_STATUS.LOADING,
      } as any);

      const { getByTestId } = renderOpenInDiscover({
        variant: 'link',
        queryParams: {},
      });

      const link = getByTestId(MOCK_DATA_TEST_SUBJ);
      expect(link).toBeInTheDocument();
      expect(link).toBeDisabled();
    });
  });

  describe('ESQL query generation', () => {
    it('should generate traces ESQL query with service name and transaction type', () => {
      renderOpenInDiscover({
        queryParams: { serviceName: MOCK_SERVICE_NAME, transactionType: 'request' },
      });

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
      expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
      expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
    });

    it('should generate traces ESQL query with transaction name filter', () => {
      renderOpenInDiscover({
        queryParams: { serviceName: MOCK_SERVICE_NAME, transactionName: 'GET /api/users' },
      });

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
    });

    it('should generate error ESQL query with error index', () => {
      renderOpenInDiscover({
        indexType: 'error',
        queryParams: { serviceName: MOCK_SERVICE_NAME, errorGroupId: 'error-123' },
      });

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`FROM ${MOCK_ERROR_INDEX}`);
      expect(esqlArg).not.toContain(MOCK_TRACES_INDEX);
    });

    it('should generate ESQL query with span ID for span view', () => {
      renderOpenInDiscover({
        queryParams: { spanId: 'span-456' },
      });

      const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
      expect(esqlArg).toContain(`\`${SPAN_ID}\` == "span-456"`);
    });
  });

  describe('consumer scenarios', () => {
    describe('waterfall (transaction details) context', () => {
      it('should generate correct query with only traceId and sort by @timestamp ASC', () => {
        renderOpenInDiscover({
          queryParams: { traceId: 'trace-abc-123', sortDirection: 'ASC' },
          label: MOCK_LABEL_FULL_TRACE,
        });

        const button = document.querySelector(`[data-test-subj="${MOCK_DATA_TEST_SUBJ}"]`);
        expect(button).toHaveTextContent(MOCK_LABEL_FULL_TRACE);

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
        expect(esqlArg).toContain(`\`trace.id\` == "trace-abc-123"`);
        expect(esqlArg).toContain('SORT @timestamp ASC');
        expect(esqlArg).not.toContain(SERVICE_NAME);
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
        expect(esqlArg).not.toContain(TRANSACTION_TYPE);
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
      });

      it('should generate query without traceId filter when traceId is not provided', () => {
        renderOpenInDiscover({
          queryParams: {},
          label: MOCK_LABEL_FULL_TRACE,
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).not.toContain('trace.id');
        expect(esqlArg).not.toContain('SORT');
      });
    });

    describe('dependency operation context', () => {
      it('should generate correct query with dependency-specific params', () => {
        renderOpenInDiscover({
          rangeFrom: 'now-24h',
          queryParams: {
            kuery: '',
            serviceName: 'upstream-service',
            environment: 'staging',
            spanName: 'SELECT * FROM users',
            dependencyName: 'postgresql',
            sampleRangeFrom: 500,
            sampleRangeTo: 2000,
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "upstream-service"`);
        expect(esqlArg).toContain(`\`${SERVICE_ENVIRONMENT}\` == "staging"`);
        expect(esqlArg).toContain(`\`${SPAN_NAME}\` == "SELECT * FROM users"`);
        expect(esqlArg).toContain(`\`${SPAN_DESTINATION_SERVICE_RESOURCE}\` == "postgresql"`);
        expect(esqlArg).toContain(`\`${SPAN_DURATION}\` >= 500`);
        expect(esqlArg).toContain(`\`${SPAN_DURATION}\` <= 2000`);
        expect(esqlArg).toContain('SORT @timestamp DESC');
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
      });
    });

    describe('trace explorer context', () => {
      it('should generate minimal query with only kuery and environment', () => {
        renderOpenInDiscover({
          rangeFrom: 'now-1h',
          queryParams: {
            kuery: 'trace.id: "abc123"',
            serviceName: 'discovered-service',
            environment: 'production',
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "discovered-service"`);
        expect(esqlArg).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
        expect(esqlArg).toContain('KQL("trace.id: \\"abc123\\"")');
        expect(esqlArg).toContain('SORT @timestamp DESC');
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
        expect(esqlArg).not.toContain(TRANSACTION_TYPE);
        expect(esqlArg).not.toContain(SPAN_NAME);
      });
    });

    describe('chart link context', () => {
      it('should generate correct query for latency/throughput/error rate charts', () => {
        renderOpenInDiscover({
          variant: 'link',
          queryParams: {
            kuery: '',
            serviceName: MOCK_SERVICE_NAME,
            environment: 'production',
            transactionName: 'GET /api/users',
            transactionType: 'request',
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${SERVICE_ENVIRONMENT}\` == "production"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
        expect(esqlArg).toContain('SORT @timestamp DESC');
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
        expect(esqlArg).not.toContain(SPAN_DURATION);
      });

      it('should generate correct query for overview charts without transactionName', () => {
        renderOpenInDiscover({
          variant: 'link',
          queryParams: {
            kuery: '',
            serviceName: MOCK_SERVICE_NAME,
            environment: 'production',
            transactionType: 'request',
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
        expect(esqlArg).toContain('SORT @timestamp DESC');
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
      });
    });

    describe('correlations context', () => {
      it('should generate correct query with sample range for correlations', () => {
        renderOpenInDiscover({
          queryParams: {
            kuery: '',
            serviceName: MOCK_SERVICE_NAME,
            environment: 'production',
            transactionName: 'GET /api/users',
            transactionType: 'request',
            sampleRangeFrom: 2000,
            sampleRangeTo: 8000,
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_TYPE}\` == "request"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_DURATION}\` >= 2000`);
        expect(esqlArg).toContain(`\`${TRANSACTION_DURATION}\` <= 8000`);
        expect(esqlArg).toContain('SORT @timestamp DESC');
      });

      it('should generate correct query without sample range when chart is not brushed', () => {
        renderOpenInDiscover({
          queryParams: {
            kuery: '',
            serviceName: MOCK_SERVICE_NAME,
            environment: 'production',
            transactionName: 'GET /api/users',
            transactionType: 'request',
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain(`\`${TRANSACTION_NAME}\` == "GET /api/users"`);
        expect(esqlArg).toContain('SORT @timestamp DESC');
        expect(esqlArg).not.toContain(TRANSACTION_DURATION);
      });
    });

    describe('error sample context', () => {
      it('should generate correct query with error index and error group ID', () => {
        renderOpenInDiscover({
          indexType: 'error',
          queryParams: {
            kuery: '',
            serviceName: MOCK_SERVICE_NAME,
            errorGroupId: 'abc123def456',
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`FROM ${MOCK_ERROR_INDEX}`);
        expect(esqlArg).not.toContain(MOCK_TRACES_INDEX);
        expect(esqlArg).toContain(`\`${ERROR_GROUP_ID}\` == "abc123def456"`);
        expect(esqlArg).toContain(`\`${SERVICE_NAME}\` == "my-service"`);
        expect(esqlArg).toContain('SORT @timestamp DESC');
      });
    });

    describe('span flyout context', () => {
      it('should generate correct query with span ID', () => {
        renderOpenInDiscover({
          queryParams: {
            kuery: 'service.name: "my-service"',
            spanId: 'span-abc-123',
            sortDirection: 'DESC',
          },
        });

        const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
        expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
        expect(esqlArg).toContain(`\`${SPAN_ID}\` == "span-abc-123"`);
        expect(esqlArg).toContain('KQL("service.name: \\"my-service\\"")');
        expect(esqlArg).toContain('SORT @timestamp DESC');
        expect(esqlArg).not.toContain(`\`${SERVICE_NAME}\` ==`);
        expect(esqlArg).not.toContain(TRANSACTION_NAME);
      });
    });
  });
});
