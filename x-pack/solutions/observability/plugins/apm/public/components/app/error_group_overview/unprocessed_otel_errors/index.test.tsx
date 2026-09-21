/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { UnprocessedOtelErrors } from '.';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUseFetcher = jest.fn();

jest.mock('../../../../hooks/use_fetcher', () => ({
  useFetcher: () => mockUseFetcher(),
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({
    query: { rangeFrom: 'now-15m', rangeTo: 'now' },
  }),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T00:15:00.000Z' }),
}));

jest.mock('../../../../hooks/use_logs_index_pattern', () => ({
  useLogsIndexPattern: () => ({ logsIndexPattern: 'logs-*' }),
}));

// OpenInDiscover and TruncateWithTooltip are complex to render in unit tests — stub them out,
// rendering only what the test needs to observe (the message label and content).
jest.mock('../../../shared/links/discover_links/open_in_discover', () => ({
  OpenInDiscover: ({ label }: { label: string }) => <a href="#discover">{label}</a>,
}));

jest.mock('@kbn/apm-ui-shared', () => ({
  ...jest.requireActual('@kbn/apm-ui-shared'),
  TruncateWithTooltip: ({ content }: { content: React.ReactNode }) => <>{content}</>,
  Timestamp: () => <span>timestamp</span>,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const apmError = {
  id: 'apm-1',
  timestamp: { us: 1700000000000000 },
  source: 'apm' as const,
  error: { exception: { message: 'APM error', type: 'RuntimeError' } },
};

const otelError1 = {
  id: 'otel-1',
  timestamp: { us: 1700000001000000 },
  source: 'unprocessedOtel' as const,
  error: { exception: { message: 'Payment timeout', type: 'IOException' } },
};

const otelError2 = {
  id: 'otel-2',
  timestamp: { us: 1700000002000000 },
  source: 'unprocessedOtel' as const,
  error: { exception: { message: 'Connection refused', type: 'NetworkError' } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderComponent(props: { traceId: string; spanId: string }) {
  return render(
    <I18nProvider>
      <UnprocessedOtelErrors {...props} />
    </I18nProvider>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('UnprocessedOtelErrors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null while loading — avoids layout jump on first fetch', () => {
    mockUseFetcher.mockReturnValue({ data: undefined, status: FETCH_STATUS.LOADING });

    const { container } = renderComponent({ traceId: 't1', spanId: 's1' });

    expect(container.firstChild).toBeNull();
  });

  it('renders null when the response contains only APM errors (client-side filter)', () => {
    // Regression guard: the OTel filter runs on the client, so APM-only responses must produce
    // no panel, even though the server returned data successfully.
    mockUseFetcher.mockReturnValue({
      data: { traceErrors: [apmError] },
      status: FETCH_STATUS.SUCCESS,
    });

    const { container } = renderComponent({ traceId: 't1', spanId: 's1' });

    expect(container.firstChild).toBeNull();
  });

  it('renders null when the server returns an empty list', () => {
    mockUseFetcher.mockReturnValue({
      data: { traceErrors: [] },
      status: FETCH_STATUS.SUCCESS,
    });

    const { container } = renderComponent({ traceId: 't1', spanId: 's1' });

    expect(container.firstChild).toBeNull();
  });

  it('renders the panel with the correct count when OTel errors are present', () => {
    mockUseFetcher.mockReturnValue({
      data: { traceErrors: [apmError, otelError1, otelError2] },
      status: FETCH_STATUS.SUCCESS,
    });

    renderComponent({ traceId: 't1', spanId: 's1' });

    // Panel is visible.
    expect(screen.getByTestId('apmUnprocessedOtelErrorsPanel')).toBeInTheDocument();
    // Title shows the OTel-only count (2), not the total response count (3).
    expect(screen.getByText('Errors from logs (2)')).toBeInTheDocument();
  });

  it('lists only unprocessedOtel rows — APM rows are excluded from the table', () => {
    mockUseFetcher.mockReturnValue({
      data: { traceErrors: [apmError, otelError1, otelError2] },
      status: FETCH_STATUS.SUCCESS,
    });

    renderComponent({ traceId: 't1', spanId: 's1' });

    expect(screen.getByText('Payment timeout')).toBeInTheDocument();
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
    expect(screen.queryByText('APM error')).not.toBeInTheDocument();
  });

  it('renders the reconciling callout', () => {
    mockUseFetcher.mockReturnValue({
      data: { traceErrors: [otelError1] },
      status: FETCH_STATUS.SUCCESS,
    });

    renderComponent({ traceId: 't1', spanId: 's1' });

    expect(screen.getByTestId('apmUnprocessedOtelErrorsCallout')).toBeInTheDocument();
  });

  it('renders a failure callout instead of a zero-count panel when the request fails', () => {
    // A backend failure must not be presented as a genuine "no OTel errors" result: every
    // waterfall click supplies these route params, so a silent (0) would be misleading.
    mockUseFetcher.mockReturnValue({ data: undefined, status: FETCH_STATUS.FAILURE });

    renderComponent({ traceId: 't1', spanId: 's1' });

    expect(screen.getByTestId('apmUnprocessedOtelErrorsFetchErrorCallout')).toBeInTheDocument();
    expect(screen.queryByText('Errors from logs (0)')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apmUnprocessedOtelErrorsCallout')).not.toBeInTheDocument();
  });
});
