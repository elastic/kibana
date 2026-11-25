/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ServiceFlyoutService } from '.';
import { ServiceFlyout, SERVICE_FLYOUT_TABS } from '.';

jest.mock('../../../plugin', () => ({
  getApmInternalServices: () => ({ callApmApi: jest.fn() }),
}));

jest.mock('../../../hooks/use_apm_indices', () => ({
  useApmIndices: () => ({ indices: undefined, loading: false }),
}));

jest.mock('../../../context/time_range_metadata/time_range_metadata_context', () => ({
  TimeRangeMetadataContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// A lightweight stand-in for the template that renders the zones' children and exposes the close and
// tab-change handlers + the history key, so the container's state wiring can be asserted in isolation.
jest.mock('@kbn/flyout-template', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const FlyoutTemplate = ({
    children,
    onClose,
    historyKey,
    onTabChange,
    tabs = [],
  }: {
    children: React.ReactNode;
    onClose: () => void;
    historyKey?: symbol;
    onTabChange?: (id: string) => void;
    tabs?: Array<{ id: string; label: React.ReactNode; [key: string]: unknown }>;
  }) => (
    <section data-test-subj="serviceFlyout" data-history-key={historyKey?.toString()}>
      <button data-test-subj="flyoutCloseButton" onClick={onClose}>
        close
      </button>
      {tabs.map(({ id, label, ...rest }) => (
        <button key={id} {...rest} onClick={() => onTabChange?.(id)}>
          {label}
        </button>
      ))}
      {children}
    </section>
  );
  FlyoutTemplate.Header = passthrough;
  FlyoutTemplate.Body = Object.assign(passthrough, { TabPanel: passthrough });
  FlyoutTemplate.Footer = Object.assign(passthrough, {
    PrimaryActionMenu: () => null,
    PrimaryAction: () => null,
    SecondaryAction: () => null,
  });
  return { __esModule: true, FlyoutTemplate };
});

jest.mock('./header', () => ({
  useServiceFlyoutTitle: (title: string) => title,
}));

jest.mock('./header/service_badges', () => ({
  useServiceBadges: () => [],
}));

jest.mock('./footer', () => ({
  useServiceFlyoutFooterMenu: () => ({
    panels: [{ id: 0, items: [] }],
    isLoading: false,
    hasActions: false,
  }),
}));

jest.mock('./hooks/use_service_flyout_capabilities', () => ({
  useServiceFlyoutCapabilities: () => ({
    loading: false,
    error: undefined,
    schema: 'ecs',
    header: { serviceNameLink: true, badges: true },
    overview: { transactions: true, transactionTypeFilter: true, infraMetrics: true },
    footer: { alerts: true, slos: true },
  }),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2024-01-01T00:00:00.000Z', end: '2024-01-01T01:00:00.000Z' }),
}));

// The overview reads environment/transactionType from context and calls the context setters.
jest.mock('./overview', () => {
  const { useServiceFlyoutContext } = jest.requireActual('./service_flyout_context');
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

const service: ServiceFlyoutService = {
  name: 'opbeans-java',
  agentName: 'java',
};

const mockReportServiceFlyoutViewed = jest.fn();

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
  jest.clearAllMocks();
});

describe('ServiceFlyout telemetry', () => {
  it('reports the initial tab on mount', () => {
    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={jest.fn()}
      />
    );

    expect(mockReportServiceFlyoutViewed).toHaveBeenCalledTimes(1);
    expect(mockReportServiceFlyoutViewed).toHaveBeenCalledWith({
      tabId: 'overview',
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
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).not.toHaveTextContent('request');
  });
});

describe('ServiceFlyout tabs', () => {
  it('renders a tab per definition instrumented with EBT click attributes', () => {
    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={jest.fn()}
      />
    );

    SERVICE_FLYOUT_TABS.forEach(({ id }) => {
      const tab = screen.getByTestId(`serviceFlyoutTab-${id}`);
      expect(tab).toHaveAttribute('data-ebt-action', 'viewServiceFlyoutTab');
      expect(tab).toHaveAttribute('data-ebt-element', 'serviceFlyoutTabs');
      expect(tab).toHaveAttribute('data-ebt-detail', id);
    });
  });
});

describe('ServiceFlyout local filter state', () => {
  it('keeps filter changes local to the flyout and does not close it', () => {
    const onClose = jest.fn();

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
    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent(
      'production:page-load'
    );
  });

  it('still closes when the flyout close handler is used', () => {
    const onClose = jest.fn();

    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('flyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not reset local filter edits when host props change without a remount', () => {
    const { rerender } = render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
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
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('staging:');
  });
});

describe('ServiceFlyout historyKey', () => {
  it('forwards historyKey to the flyout when provided', () => {
    const historyKey = Symbol('test-history-key');

    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onClose={jest.fn()}
        historyKey={historyKey}
      />
    );

    expect(screen.getByTestId('serviceFlyout')).toHaveAttribute(
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
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyout')).toHaveAttribute('data-history-key');
  });
});
