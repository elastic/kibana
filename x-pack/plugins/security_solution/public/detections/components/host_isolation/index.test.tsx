/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import { HostIsolationPanel } from '.';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  logger: {
    log: () => null,
    warn: () => null,
    error: () => null,
  },
});

const useKibanaMock = mockUseKibana as jest.Mock;
jest.mock('../../../common/lib/kibana');

describe('HostIsolationPanel', () => {
  const renderWithContext = (Element: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>);
  beforeEach(() => {
    useKibanaMock.mockReturnValue({
      ...mockUseKibana(),
      services: { ...mockUseKibana().services, notifications: { toasts: jest.fn() } },
    });
  });
  const details = [
    {
      category: 'observer',
      field: 'observer.serial_number',
      values: ['expectedSentinelOneAgentId'],
      originalValue: ['expectedSentinelOneAgentId'],
      isObjectArray: false,
    },
    {
      category: 'crowdstrike',
      field: 'crowdstrike.event.DeviceId',
      values: ['expectedCrowdstrikeAgentId'],
      originalValue: ['expectedCrowdstrikeAgentId'],
      isObjectArray: false,
    },
  ];

  const cancelCallback = jest.fn();

  it('renders IsolateHost when isolateAction is "isolateHost"', () => {
    const { getByText } = renderWithContext(
      <HostIsolationPanel
        details={details}
        cancelCallback={cancelCallback}
        isolateAction="isolateHost"
      />
    );

    const textPieces = [
      'Isolate host ',
      'from network.',
      'Isolating a host will disconnect it from the network. The host will only be able to communicate with the Kibana platform.',
    ];

    textPieces.forEach((textPiece) => {
      expect(getByText(textPiece, { exact: false })).toBeInTheDocument();
    });
  });

  it('renders UnisolateHost when isolateAction is "unisolateHost"', () => {
    const { getByText } = renderWithContext(
      <HostIsolationPanel
        details={details}
        cancelCallback={cancelCallback}
        isolateAction="unisolateHost"
      />
    );

    const textPieces = [
      'is currently',
      'isolated',
      '. Are you sure you want to',
      'release',
      'this host?',
    ];

    textPieces.forEach((textPiece) => {
      expect(getByText(textPiece, { exact: false })).toBeInTheDocument();
    });
  });
});
