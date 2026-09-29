/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EuiProvider } from '@elastic/eui';
import { ErrorSampler } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

const mockUseFetcher = vi.fn();

vi.mock('../../../../hooks/use_fetcher', () => {
  const mocked = {
    useFetcher: () => mockUseFetcher(),
    isPending: vi.fn((status: string) => status === 'loading' || status === 'not_initiated'),
    isSuccess: vi.fn((status: string) => status === 'success'),
    isFailure: vi.fn((status: string) => status === 'failure'),
    FETCH_STATUS: {
      LOADING: 'loading',
      SUCCESS: 'success',
      FAILURE: 'failure',
      NOT_INITIATED: 'not_initiated',
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../hooks/use_apm_params', () => {
  const mocked = {
    useAnyOfApmParams: () => ({
      path: { groupId: 'test-group-id' },
      query: {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
        errorId: 'error-id-1',
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../context/apm_service/use_apm_service_context', () => {
  const mocked = {
    useApmServiceContext: () => ({ serviceName: 'test-service' }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../hooks/use_time_range', () => {
  const mocked = {
    useTimeRange: () => ({
      start: '2025-01-01T00:00:00.000Z',
      end: '2025-01-02T00:00:00.000Z',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./error_sample_contextual_insight', () => {
  const mocked = {
    ErrorSampleContextualInsight: () => null,
  };
  return { ...mocked, default: mocked };
});

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <EuiProvider>
      <MemoryRouter
        initialEntries={[
          '/services/test-service/errors/test-group-id?rangeFrom=now-24h&rangeTo=now&environment=ENVIRONMENT_ALL&kuery=&errorId=error-id-1',
        ]}
      >
        <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
      </MemoryRouter>
    </EuiProvider>
  );
}

const minimalErrorData = {
  error: {
    '@timestamp': '2025-01-01T00:00:00.000Z',
    service: { name: 'test-service' },
    error: { id: 'error-id-1', grouping_key: 'test-group-id' },
    agent: { name: 'nodejs' },
  },
  transaction: undefined,
};

describe('ErrorSampler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.LOADING,
    });

    const { container } = render(
      <ErrorSampler
        errorSampleIds={['error-id-1']}
        errorSamplesFetchStatus={FETCH_STATUS.LOADING}
        occurrencesCount={1}
      />,
      { wrapper: Wrapper }
    );

    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('does not show infinite spinner when error data is returned with transaction undefined', () => {
    mockUseFetcher.mockReturnValue({
      data: minimalErrorData,
      status: FETCH_STATUS.SUCCESS,
    });

    const { container } = render(
      <ErrorSampler
        errorSampleIds={['error-id-1']}
        errorSamplesFetchStatus={FETCH_STATUS.SUCCESS}
        occurrencesCount={1}
      />,
      { wrapper: Wrapper }
    );

    expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.getByText('Error sample')).toBeInTheDocument();
  });

  it('shows error message instead of spinner when error sample fetch fails', () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.FAILURE,
    });

    const { container } = render(
      <ErrorSampler
        errorSampleIds={['error-id-1']}
        errorSamplesFetchStatus={FETCH_STATUS.FAILURE}
        occurrencesCount={1}
      />,
      { wrapper: Wrapper }
    );

    expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.getByText('Failed to fetch error sample')).toBeInTheDocument();
  });

  it('shows error message instead of spinner when error detail fetch fails', () => {
    mockUseFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.FAILURE,
    });

    const { container } = render(
      <ErrorSampler
        errorSampleIds={['error-id-1']}
        errorSamplesFetchStatus={FETCH_STATUS.SUCCESS}
        occurrencesCount={1}
      />,
      { wrapper: Wrapper }
    );

    expect(container.querySelector('.euiLoadingSpinner')).not.toBeInTheDocument();
    expect(screen.getByText('Failed to fetch error sample')).toBeInTheDocument();
  });
});
