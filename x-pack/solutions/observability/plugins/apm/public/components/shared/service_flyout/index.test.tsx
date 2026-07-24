/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ServiceFlyoutService } from '.';
import { ServiceFlyout } from '.';

jest.mock('../../../context/time_range_metadata/time_range_metadata_context', () => ({
  TimeRangeMetadataContextProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useGeneratedHtmlId: () => 'service-flyout-title-id',
  };
});

jest.mock('../responsive_flyout', () => ({
  ResponsiveFlyout: ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <section data-test-subj="responsiveFlyoutMock">
      <button data-test-subj="responsiveFlyoutCloseButton" onClick={onClose}>
        close
      </button>
      {children}
    </section>
  ),
}));

jest.mock('./header', () => ({
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

// The footer reads environment/transactionType from context to display them.
jest.mock('./footer', () => {
  const { useServiceFlyoutContext } = jest.requireActual('./service_flyout_context');
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

const contextProps = {
  deps: {
    core: {} as any,
    share: {} as any,
    lens: {} as any,
    dataViews: {} as any,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServiceFlyout onView', () => {
  it('notifies the consumer with the initial tab on mount', () => {
    const onView = jest.fn();

    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onView={onView}
        onClose={jest.fn()}
      />
    );

    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith({ tabId: 'overview' });
  });

  it('notifies the consumer with the new tab when the selected tab changes', () => {
    const onView = jest.fn();

    render(
      <ServiceFlyout
        {...contextProps}
        service={service}
        filters={{ environment: 'ENVIRONMENT_ALL', rangeFrom: 'now-15m', rangeTo: 'now' }}
        onView={onView}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('mockTabChange'));

    expect(onView).toHaveBeenLastCalledWith({ tabId: 'alerts' });
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
    expect(screen.getByTestId('serviceFlyoutFooterMock')).toHaveTextContent('production:page-load');
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

    fireEvent.click(screen.getByTestId('responsiveFlyoutCloseButton'));

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
