/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { EmptyStates } from '.';
import { TestProviders } from '../../../common/mock';

describe('EmptyStates', () => {
  describe('when the Welcome prompt should be shown', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = 0; // <-- no connectors configured
      const alertsContextCount = null;
      const alertsCount = 0;
      const attackDiscoveriesCount = 0;
      const connectorId = undefined;
      const isLoading = false;
      const onGenerate = jest.fn();

      render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={null}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('renders the Welcome prompt', () => {
      expect(screen.getByTestId('welcome')).toBeInTheDocument();
    });

    it('does NOT render the No Alerts prompt', () => {
      expect(screen.queryByTestId('noAlerts')).not.toBeInTheDocument();
    });

    it('does NOT render the Empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });
  });

  describe('when the No Alerts prompt should be shown', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = 1;
      const alertsContextCount = 0; // <-- no alerts to analyze
      const alertsCount = 0;
      const attackDiscoveriesCount = 0;
      const connectorId = 'test-connector-id';
      const isLoading = false;
      const onGenerate = jest.fn();

      render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={null}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('does NOT render the Welcome prompt', () => {
      expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
    });

    it('does NOT render the Failure prompt', () => {
      expect(screen.queryByTestId('failure')).not.toBeInTheDocument();
    });

    it('renders the No Alerts prompt', () => {
      expect(screen.getByTestId('noAlerts')).toBeInTheDocument();
    });

    it('does NOT render the Empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });
  });

  describe('when the Failure prompt should be shown', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = 1;
      const alertsContextCount = 10;
      const alertsCount = 10;
      const attackDiscoveriesCount = 10;
      const connectorId = 'test-connector-id';
      const isLoading = false;
      const onGenerate = jest.fn();

      render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={"you're a failure"}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('does NOT render the Welcome prompt', () => {
      expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
    });

    it('renders the Failure prompt', () => {
      expect(screen.getByTestId('failure')).toBeInTheDocument();
    });

    it('does NOT render the No Alerts prompt', () => {
      expect(screen.queryByTestId('noAlerts')).not.toBeInTheDocument();
    });

    it('does NOT render the Empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });
  });

  describe('when the Failure prompt should NOT be shown, because loading is true', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = 1;
      const alertsContextCount = 10;
      const alertsCount = 10;
      const attackDiscoveriesCount = 10;
      const connectorId = 'test-connector-id';
      const failureReason = 'this failure should NOT be displayed, because we are loading'; // <-- failureReason is provided
      const isLoading = true; // <-- loading data
      const onGenerate = jest.fn();

      render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={failureReason}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('does NOT render the Welcome prompt', () => {
      expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
    });

    it('does NOT render the Failure prompt', () => {
      expect(screen.queryByTestId('failure')).not.toBeInTheDocument();
    });

    it('does NOT render the No Alerts prompt', () => {
      expect(screen.queryByTestId('noAlerts')).not.toBeInTheDocument();
    });

    it('does NOT render the Empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });
  });

  describe('when the Empty prompt should be shown', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = 1;
      const alertsContextCount = 20; // <-- alerts were sent as context to be analyzed
      const alertsCount = 0; // <-- no alerts contributed to attack discoveries
      const attackDiscoveriesCount = 0; // <-- no attack discoveries were generated from the alerts
      const connectorId = 'test-connector-id';
      const isLoading = false;
      const onGenerate = jest.fn();

      render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={null}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('does NOT render the Welcome prompt', () => {
      expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
    });

    it('does NOT render the Failure prompt', () => {
      expect(screen.queryByTestId('failure')).not.toBeInTheDocument();
    });

    it('does NOT render the No Alerts prompt', () => {
      expect(screen.queryByTestId('noAlerts')).not.toBeInTheDocument();
    });

    it('renders the Empty prompt', () => {
      expect(screen.getByTestId('emptyPrompt')).toBeInTheDocument();
    });
  });

  describe('when the Empty prompt should NOT be shown, because aiConnectorsCount is null (no connectors are configured)', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = null; // <-- no connectors configured
      const alertsContextCount = 20; // <-- alerts were sent as context to be analyzed
      const alertsCount = 0;
      const attackDiscoveriesCount = 0;
      const connectorId = undefined;
      const isLoading = false;
      const onGenerate = jest.fn();

      render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={null}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('does NOT render the Welcome prompt', () => {
      expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
    });

    it('does NOT render the Failure prompt', () => {
      expect(screen.queryByTestId('failure')).not.toBeInTheDocument();
    });

    it('does NOT render the No Alerts prompt', () => {
      expect(screen.queryByTestId('noAlerts')).not.toBeInTheDocument();
    });

    it('does NOT render the Empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });
  });

  describe('when loading', () => {
    let result: ReturnType<typeof render>;

    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = 0; // <-- no connectors configured (welcome prompt should be shown if not loading)
      const alertsContextCount = null;
      const alertsCount = 0;
      const attackDiscoveriesCount = 0;
      const connectorId = undefined;
      const isLoading = true; // <-- loading data
      const onGenerate = jest.fn();

      result = render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={null}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('does NOT render the Welcome prompt', () => {
      expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
    });

    it('does NOT render the Failure prompt', () => {
      expect(screen.queryByTestId('failure')).not.toBeInTheDocument();
    });

    it('does NOT render the No Alerts prompt', () => {
      expect(screen.queryByTestId('noAlerts')).not.toBeInTheDocument();
    });

    it('does NOT render the Empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });

    it('returns null', () => {
      expect(result.container).toBeEmptyDOMElement();
    });
  });

  describe('when attack discoveries are present', () => {
    let result: ReturnType<typeof render>;

    beforeEach(() => {
      jest.clearAllMocks();

      const aiConnectorsCount = 1;
      const alertsContextCount = 20; // <-- alerts were sent as context to be analyzed
      const alertsCount = 10; // <-- alerts contributed to attack discoveries
      const attackDiscoveriesCount = 3; // <-- attack discoveries were generated from the alerts
      const connectorId = 'test-connector-id';
      const isLoading = false;
      const onGenerate = jest.fn();

      result = render(
        <TestProviders>
          <EmptyStates
            aiConnectorsCount={aiConnectorsCount}
            alertsContextCount={alertsContextCount}
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            connectorId={connectorId}
            failureReason={null}
            isLoading={isLoading}
            onGenerate={onGenerate}
          />
        </TestProviders>
      );
    });

    it('does NOT render the Welcome prompt', () => {
      expect(screen.queryByTestId('welcome')).not.toBeInTheDocument();
    });

    it('does NOT render the Failure prompt', () => {
      expect(screen.queryByTestId('failure')).not.toBeInTheDocument();
    });

    it('does NOT render the No Alerts prompt', () => {
      expect(screen.queryByTestId('noAlerts')).not.toBeInTheDocument();
    });

    it('does NOT render the Empty prompt', () => {
      expect(screen.queryByTestId('emptyPrompt')).not.toBeInTheDocument();
    });

    it('returns null', () => {
      expect(result.container).toBeEmptyDOMElement();
    });
  });
});
