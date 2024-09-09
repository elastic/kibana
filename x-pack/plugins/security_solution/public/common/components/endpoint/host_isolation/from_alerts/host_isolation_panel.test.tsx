/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderReactTestingLibraryWithI18n as render } from '@kbn/test-jest-helpers';
import { HostIsolationPanel } from '.';
import { useKibana as mockUseKibana } from '../../../../lib/kibana/__mocks__';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { endpointAlertDataMock } from '../../../../mock/endpoint';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

const queryClient = new QueryClient({
  logger: {
    log: () => null,
    warn: () => null,
    error: () => null,
  },
});

jest.mock('../../../../experimental_features_service');

const useKibanaMock = mockUseKibana as jest.Mock;
jest.mock('../../../../lib/kibana');

describe('HostIsolationPanel', () => {
  const renderWithContext = (Element: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>);
  let cancelCallback: () => void;
  let details: TimelineEventsDetailsItem[];

  beforeEach(() => {
    useKibanaMock.mockReturnValue({
      ...mockUseKibana(),
      services: { ...mockUseKibana().services, notifications: { toasts: jest.fn() } },
    });

    cancelCallback = jest.fn();
    details = endpointAlertDataMock.generateEndpointAlertDetailsItemData();
  });

  it('should render warning callout if alert data host does not support response actions', () => {
    const { getByTestId } = renderWithContext(
      <HostIsolationPanel
        details={[]}
        cancelCallback={cancelCallback}
        isolateAction="isolateHost"
      />
    );

    expect(getByTestId('unsupportedAlertHost')).toHaveTextContent(
      "The alert's host () does not support host isolation response actions."
    );
  });

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
