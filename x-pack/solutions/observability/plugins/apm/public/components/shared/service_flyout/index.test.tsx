/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ServiceNodeData } from '../../../../common/service_map';
import { ServiceFlyout } from '.';

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
  ServiceFlyoutHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

jest.mock('./overview', () => ({
  ServiceFlyoutOverview: ({
    environment,
    transactionType,
    onEnvironmentChange,
    onTransactionTypeChange,
  }: {
    environment: string;
    transactionType: string;
    onEnvironmentChange: (environment: string) => void;
    onTransactionTypeChange: (transactionType: string) => void;
  }) => (
    <div data-test-subj="serviceFlyoutOverviewMock">
      <button
        data-test-subj="mockEnvironmentChange"
        onClick={() => onEnvironmentChange('production')}
      >
        change environment
      </button>
      <button
        data-test-subj="mockTransactionTypeChange"
        onClick={() => onTransactionTypeChange('page-load')}
      >
        change transaction type
      </button>
      <span data-test-subj="serviceFlyoutOverviewReadout">
        {environment}:{transactionType}
      </span>
    </div>
  ),
}));

jest.mock('./footer', () => ({
  ServiceFlyoutFooter: ({
    environment,
    transactionType,
  }: {
    environment: string;
    transactionType: string;
  }) => (
    <div data-test-subj="serviceFlyoutFooterMock">
      {environment}:{transactionType}
    </div>
  ),
}));

const service: ServiceNodeData = {
  id: 'opbeans-java',
  label: 'opbeans-java',
  isService: true,
  agentName: 'java',
};

describe('ServiceFlyout local filter state', () => {
  it('keeps filter changes local to the flyout and does not close it', () => {
    const onClose = jest.fn();

    render(
      <ServiceFlyout
        service={service}
        environment="ENVIRONMENT_ALL"
        kuery=""
        initialRangeFrom="now-15m"
        initialRangeTo="now"
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
        service={service}
        environment="ENVIRONMENT_ALL"
        kuery=""
        initialRangeFrom="now-15m"
        initialRangeTo="now"
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('responsiveFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not reset local filter edits when host props change without a remount', () => {
    const { rerender } = render(
      <ServiceFlyout
        service={service}
        environment="ENVIRONMENT_ALL"
        kuery=""
        initialRangeFrom="now-15m"
        initialRangeTo="now"
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('mockEnvironmentChange'));
    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('production:');

    // Same key (same service): a host environment change must not clobber the local edit.
    rerender(
      <ServiceFlyout
        service={service}
        environment="staging"
        kuery=""
        initialRangeFrom="now-15m"
        initialRangeTo="now"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('production:');
  });

  it('re-seeds local state from props when remounted for a different service', () => {
    const { rerender } = render(
      <ServiceFlyout
        key={service.id}
        service={service}
        environment="ENVIRONMENT_ALL"
        kuery=""
        initialRangeFrom="now-15m"
        initialRangeTo="now"
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('mockEnvironmentChange'));
    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('production:');

    // A different `key` (different service) remounts the flyout, re-seeding from the new props.
    const otherService: ServiceNodeData = { ...service, id: 'opbeans-go', label: 'opbeans-go' };
    rerender(
      <ServiceFlyout
        key={otherService.id}
        service={otherService}
        environment="staging"
        kuery=""
        initialRangeFrom="now-15m"
        initialRangeTo="now"
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('serviceFlyoutOverviewReadout')).toHaveTextContent('staging:');
  });
});
