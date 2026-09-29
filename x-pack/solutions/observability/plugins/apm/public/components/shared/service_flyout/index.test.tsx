/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ServiceFlyoutService } from '.';
import { ServiceFlyout } from '.';

vi.mock('../../../plugin', () => {
      const mocked = {
      getApmInternalServices: () => ({ callApmApi: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_apm_indices', () => {
      const mocked = {
      useApmIndices: () => ({ indices: undefined, loading: false }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../context/time_range_metadata/time_range_metadata_context', () => {
      const mocked = {
      TimeRangeMetadataContextProvider: ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@elastic/eui', async () => {
  const original = (await vi.importActual('@elastic/eui'));
  return {
    ...original,
    EuiPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useGeneratedHtmlId: () => 'service-flyout-title-id',
  };
});

vi.mock('../responsive_flyout', () => {
      const mocked = {
      ResponsiveFlyout: ({
        children,
        onClose,
        historyKey,
      }: {
        children: React.ReactNode;
        onClose: () => void;
        historyKey?: symbol;
      }) => (
        <section data-test-subj="responsiveFlyoutMock" data-history-key={historyKey?.toString()}>
          <button data-test-subj="responsiveFlyoutCloseButton" onClick={onClose}>
            close
          </button>
          {children}
        </section>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./hooks/use_service_flyout_capabilities', () => {
      const mocked = {
      useServiceFlyoutCapabilities: () => ({
        loading: false,
        error: undefined,
        schema: 'ecs',
        header: { serviceNameLink: true, badges: true },
        overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
        footer: { alerts: true, slos: true },
      }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../hooks/use_time_range', () => {
      const mocked = {
      useTimeRange: () => ({ start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T01:00:00.000Z' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./header', () => {
      const mocked = {
      ServiceFlyoutHeader: ({
        title,
        onSelectedTabIdChange,
      }: {
        title: string;
        onSelectedTabIdChange: (tabId: string) => void;
      }) => (
        <div>
          <h2>{title}</h2>
          <button data-test-subj="mockTabChange" onClick={() => onSelectedTabIdChange('alerts')}>
            change tab
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

// The overview reads environment/transactionType from context and calls the context setters.
vi.mock('./overview', async () => {
  const { useServiceFlyoutContext } = (await vi.importActual('./service_flyout_context'));
  return {
    ServiceFlyoutOverview: () => {
      const {
        filters: { environment, transactionType, setEnvironment, setTransactionType },
      } = useServiceFlyoutContext();
      return (
        <div data-test-subj="serviceFlyoutOverviewMock">
          <button
            data-test-subj="mockEnvironmentChange"
            onClick={() => setEnvironment('production')}
          >
            change environment
          </button>
          <button
            data-test-subj="mockTransactionTypeChange"
            onClick={() => setTransactionType?.('page-load')}
          >
            change transaction type
          </button>
          <span data-test-subj="serviceFlyoutOverviewReadout">
            {environment}:{transactionType}
          </span>
        </div>
      );
    },
  };
});

// The footer reads environment/transactionType from context to display them.
vi.mock('./footer', async () => {
  const { useServiceFlyoutContext } = (await vi.importActual('./service_flyout_context'));
  return {
    ServiceFlyoutFooter: () => {
      const {
        filters: { environment, transactionType },
      } = useServiceFlyoutContext();
      return (
        <div data-test-subj="serviceFlyoutFooterMock">
          {environment}:{transactionType}
        </div>
      );
    },
  };
});

const service: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

const mockReportServiceFlyoutViewed = vi.fn();

const contextProps = {
  deps: {
    core: {} as any,
    share: {} as any,
    lens: {} as any,
    dataViews: {} as any,
  },
  telemetry: {
    client: { reportServiceFlyoutViewed: mockReportServiceFlyoutViewed },
    source: 'test-source',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ServiceFlyout telemetry', () => {
  it('reports the initial tab on mount', () => {
    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    expect(mockReportServiceFlyoutViewed).toHaveBeenCalledTimes(1);
    expect(mockReportServiceFlyoutViewed).toHaveBeenCalledWith({
      tabId: 'overview',
      source: 'test-source',
    });
  });

  it('reports the new tab when the selected tab changes', () => {
    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('mockTabChange'));

    expect(mockReportServiceFlyoutViewed).toHaveBeenLastCalledWith({
      tabId: 'alerts',
      source: 'test-source',
    });
  });
});

describe('ServiceFlyout initial state', () => {
  it('does not seed transactionType from a hardcoded default before the fetch resolves', () => {
    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).not.toHaveTextContent('request');
  });
});

describe('ServiceFlyout local filter state', () => {
  it('keeps filter changes local to the flyout and does not close it', () => {
    const onClose = vi.fn();

    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('mockEnvironmentChange'));
    fireEvent.click(screen.getByTestId('mockTransactionTypeChange'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('serviceFlyoutFooterMock')).toHaveTextContent('production:page-load');
    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent(
      'production:page-load'
    );
  });

  it('still closes when the flyout close handler is used', () => {
    const onClose = vi.fn();

    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('responsiveFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not reset local filter edits when host props change without a remount', () => {
    const { rerender } = render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('mockEnvironmentChange'));
    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('production:');

    // Same key (same service): a host environment change must not clobber the local edit.
    rerender(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'staging', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('production:');
  });

  it('re-seeds local state from props when remounted for a different service', () => {
    const { rerender } = render(
      <ServiceFlyout
        {...contextProps}
        key={service.name}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('mockEnvironmentChange'));
    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('production:');

    // A different `key` (different service) remounts the flyout, re-seeding from the new props.
    const otherService: ServiceFlyoutService = {
      ...service,
      name: 'opbeans-go',
    };
    rerender(
      <ServiceFlyout
        {...contextProps}
        key={otherService.name}
        service={otherService}
        filters={{ environment: 'staging', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('staging:');
  });
});

describe('ServiceFlyout historyKey', () => {
  it('forwards historyKey to ResponsiveFlyout when provided', () => {
    const historyKey = Symbol('test-history-key');

    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
        historyKey={historyKey}
      />
    );

    expect(screen.getByTestId('responsiveFlyoutMock')).toHaveAttribute(
      'data-history-key',
      historyKey.toString()
    );
  });

  // Nested tx/full-trace flyouts need a shared history key for Back. When the
  // caller omits `historyKey`, ServiceFlyout creates one (Symbol fallback).
  it('generates a historyKey when not provided', () => {
    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('responsiveFlyoutMock')).toHaveAttribute('data-history-key');
  });
});
