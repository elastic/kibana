/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ServiceContents } from './service_contents';
import type { ServiceMapNode } from '../../../../../common/service_map';

jest.mock('../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      comparisonEnabled: false,
      offset: undefined,
    },
  }),
}));

jest.mock('../../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({
    link: jest.fn((path: string) => `/app/apm${path}`),
  }),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start: '2023-01-01T00:00:00.000Z',
    end: '2023-01-01T01:00:00.000Z',
  }),
}));

jest.mock('../../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
  useFetcher: () => ({
    data: { currentPeriod: {}, previousPeriod: undefined },
    status: 'success',
  }),
}));

jest.mock('./anomaly_detection', () => ({
  AnomalyDetection: () => null,
}));

jest.mock('./stats_list', () => ({
  StatsList: () => <div data-testid="stats-list" />,
}));

function serviceNode(serviceName: string): ServiceMapNode {
  return {
    id: serviceName,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id: serviceName,
      label: serviceName,
      isService: true,
    },
  };
}

describe('ServiceContents', () => {
  const defaultProps = {
    selection: serviceNode('test-service'),
    environment: 'production' as const,
    kuery: '',
    start: '2023-01-01T00:00:00.000Z',
    end: '2023-01-01T01:00:00.000Z',
    onFocusClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Service Details button', () => {
    render(<ServiceContents {...defaultProps} />);
    expect(screen.getByTestId('apmServiceContentsServiceDetailsButton')).toBeInTheDocument();
  });

  describe('Focus map button', () => {
    it('renders when isEmbedded is false', () => {
      render(<ServiceContents {...defaultProps} isEmbedded={false} />);
      expect(screen.getByTestId('apmServiceContentsFocusMapButton')).toBeInTheDocument();
    });

    it('renders when isEmbedded is undefined', () => {
      render(<ServiceContents {...defaultProps} />);
      expect(screen.getByTestId('apmServiceContentsFocusMapButton')).toBeInTheDocument();
    });

    it('does not render when isEmbedded is true', () => {
      render(<ServiceContents {...defaultProps} isEmbedded={true} />);
      expect(screen.queryByTestId('apmServiceContentsFocusMapButton')).not.toBeInTheDocument();
    });
  });
});
